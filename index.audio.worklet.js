/**************************************************************************/
/*  audio.worklet.js                                                      */
/**************************************************************************/
/*                         This file is part of:                          */
/*                             GODOT ENGINE                               */
/*                        https://godotengine.org                         */
/**************************************************************************/
/* Copyright (c) 2014-present Godot Engine contributors (see AUTHORS.md). */
/* Copyright (c) 2007-2014 Juan Linietsky, Ariel Manzur.                  */
/*                                                                        */
/* Permission is hereby granted, free of charge, to any person obtaining  */
/* a copy of this software and associated documentation files (the        */
/* "Software"), to deal in the Software without restriction, including    */
/* without limitation the rights to use, copy, modify, merge, publish,    */
/* distribute, sublicense, and/or sell copies of the Software, and to     */
/* permit persons to whom the Software is furnished to do so, subject to  */
/* the following conditions:                                              */
/*                                                                        */
/* The above copyright notice and this permission notice shall be         */
/* included in all copies or substantial portions of the Software.        */
/*                                                                        */
/* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,        */
/* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF     */
/* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. */
/* IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY   */
/* CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,   */
/* TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE      */
/* SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                 */
/**************************************************************************/

class RingBuffer{constructor(t,s,i){this.buffer=t,this.avail=s,this.threads=i,this.rpos=0,this.wpos=0}data_left(){return this.threads?Atomics.load(this.avail,0):this.avail}space_left(){return this.buffer.length-this.data_left()}read(t){const s=this.buffer.length;let i=0,r=t.length;if(this.rpos+r>s){const e=s-this.rpos;t.set(this.buffer.subarray(this.rpos,s)),i=e,r-=e,this.rpos=0}r&&t.set(this.buffer.subarray(this.rpos,this.rpos+r),i),this.rpos+=r,this.threads?(Atomics.add(this.avail,0,-t.length),Atomics.notify(this.avail,0)):this.avail-=t.length}write(t){const s=t.length,i=this.buffer.length-this.wpos;if(i>=s)this.buffer.set(t,this.wpos),this.wpos+=s,i===s&&(this.wpos=0);else{const s=t.subarray(0,i),r=t.subarray(i);this.buffer.set(s,this.wpos),this.buffer.set(r),this.wpos=r.length}this.threads?(Atomics.add(this.avail,0,s),Atomics.notify(this.avail,0)):this.avail+=s}}class GodotProcessor extends AudioWorkletProcessor{constructor(){super(),this.threads=!1,this.running=!0,this.lock=null,this.notifier=null,this.output=null,this.output_buffer=new Float32Array,this.input=null,this.input_buffer=new Float32Array,this.port.onmessage=t=>{const s=t.data.cmd,i=t.data.data;this.parse_message(s,i)}}process_notify(){this.notifier&&(Atomics.add(this.notifier,0,1),Atomics.notify(this.notifier,0))}parse_message(t,s){if("start"===t&&s){const t=s[0];let i=0;this.threads=!0,this.lock=t.subarray(i,++i),this.notifier=t.subarray(i,++i);const r=t.subarray(i,++i),e=t.subarray(i,++i);this.input=new RingBuffer(s[1],r,!0),this.output=new RingBuffer(s[2],e,!0)}else"stop"===t?(this.running=!1,this.output=null,this.input=null,this.lock=null,this.notifier=null):"start_nothreads"===t?this.output=new RingBuffer(s[0],s[0].length,!1):"chunk"===t&&this.output.write(s)}static array_has_data(t){return t.length&&t[0].length&&t[0][0].length}process(t,s,i){if(!this.running)return!1;if(null===this.output)return!0;if(GodotProcessor.array_has_data(t)){const s=t[0],i=s[0].length*s.length;this.input_buffer.length!==i&&(this.input_buffer=new Float32Array(i)),this.threads?this.input.space_left()>=i&&(GodotProcessor.write_input(this.input_buffer,s),this.input.write(this.input_buffer)):(GodotProcessor.write_input(this.input_buffer,s),this.port.postMessage({cmd:"input",data:this.input_buffer}))}if(GodotProcessor.array_has_data(s)){const t=s[0],i=t[0].length*t.length;this.output_buffer.length!==i&&(this.output_buffer=new Float32Array(i)),this.output.data_left()>=i&&(this.output.read(this.output_buffer),GodotProcessor.write_output(t,this.output_buffer),this.threads||this.port.postMessage({cmd:"read",data:i}))}return this.process_notify(),!0}static write_output(t,s){const i=t.length;for(let r=0;r<i;r++)for(let e=0;e<t[r].length;e++)t[r][e]=s[e*i+r]}static write_input(t,s){const i=s.length;for(let r=0;r<i;r++)for(let e=0;e<s[r].length;e++)t[e*i+r]=s[r][e]}}registerProcessor("godot-processor",GodotProcessor);