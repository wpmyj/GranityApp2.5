if(!window.ComponentArt_DragDrop_Loaded){window._q133=function(e,_2,_3,_4,_5,_6,_7,_8,_9,_a){window.ComponentArt_DragHorizontal=_9;window.ComponentArt_DragVertical=_a;window.ComponentArt_DragThreshold=_3;window._qF3=_2;window.ComponentArt_DragInProgress=false;window.ComponentArt_DragBeginHandler=_6;window.ComponentArt_DragMoveHandler=_7;window.ComponentArt_DragDropHandler=_8;window.ComponentArt_DragOffsetX=_4;window.ComponentArt_DragOffsetY=_5;var _b=cart_browser_ie?event.clientX+(document.documentElement&&document.documentElement.scrollLeft?document.documentElement.scrollLeft:document.body.scrollLeft):e.pageX;var _c=cart_browser_ie?event.clientY+(document.documentElement&&document.documentElement.scrollTop?document.documentElement.scrollTop:document.body.scrollTop):e.pageY;window.ComponentArt_DragBeginX=_b;window.ComponentArt_DragBeginY=_c;document.onmousemove=ComponentArt_Drag;document.onmouseup=ComponentArt_EndDrag;if(_3==0){ComponentArt_BeginDrag(_b,_c);}};window.ComponentArt_BeginDrag=function(x,y){if(ComponentArt_DragBeginHandler){var _f=ComponentArt_DragBeginHandler(x,y);if(_f){window._qF3=_f;}}ComponentArt_DragInProgress=true;};window.ComponentArt_Drag=function(e){ComponentArt_CancelEvent(e);var _11=cart_browser_ie?event.clientX+(document.documentElement&&document.documentElement.scrollLeft?document.documentElement.scrollLeft:document.body.scrollLeft):e.pageX;var _12=cart_browser_ie?event.clientY+(document.documentElement&&document.documentElement.scrollTop?document.documentElement.scrollTop:document.body.scrollTop):e.pageY;if(!ComponentArt_DragInProgress&&Math.max(Math.abs(_11-ComponentArt_DragBeginX),Math.abs(_12-ComponentArt_DragBeginY))>ComponentArt_DragThreshold){ComponentArt_BeginDrag(_11,_12);}if(ComponentArt_DragInProgress){if(ComponentArt_DragMoveHandler){ComponentArt_DragMoveHandler(_qF3,_11,_12);}if(ComponentArt_DragHorizontal){_qF3.style.left=(_11-ComponentArt_DragOffsetX)+"px";}if(ComponentArt_DragVertical){_qF3.style.top=(_12-ComponentArt_DragOffsetY)+"px";}}};window.ComponentArt_EndDrag=function(e){var _14=cart_browser_ie?event.clientX+(document.documentElement&&document.documentElement.scrollLeft?document.documentElement.scrollLeft:document.body.scrollLeft):e.pageX;var _15=cart_browser_ie?event.clientY+(document.documentElement&&document.documentElement.scrollTop?document.documentElement.scrollTop:document.body.scrollTop):e.pageY;if(ComponentArt_DragInProgress){ComponentArt_DragDropHandler(_qF3,_14,_15);}_qF3=null;ComponentArt_DragMoveHandler=null;ComponentArt_DragDropHandler=null;ComponentArt_DragInProgress=false;document.onmousemove=null;document.onmouseup=null;};window.ComponentArt_DragDrop_Loaded=true;}