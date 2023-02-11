const $ = document.querySelector.bind(document);

let dragOffsetX;
let dragOffsetY;

const draggedElement = $('.volume-hud-custom');
const dragTarget = $('ytmusic-player') ?? $('#movie_player');

draggedElement.draggable = true;
draggedElement.style.pointerEvents = 'auto';

draggedElement.style.opacity = 1; // DELETE testing

draggedElement.ondragstart = function(ev) {
    const { width, height } = window.getComputedStyle(draggedElement, null);

    ev.dataTransfer.setDragImage(draggedElement, parseFloat(width) / 2, parseFloat(height) / 2);
    const rect = ev.target.getBoundingClientRect();

    dragOffsetX = ev.clientX - rect.x;
    dragOffsetY = ev.clientY - rect.y;
};

dragTarget.ondrop = function(ev) {
    ev.preventDefault();

    const dragTargetRect = dragTarget.getBoundingClientRect();

    draggedElement.style.position = 'absolute';

    const newLeft = ev.clientX - dragTargetRect.x - dragOffsetX ;
    const newTop = ev.clientY - dragTargetRect.y - dragOffsetY ;
    /// log clientX, clientY, offsetLeft, offsetTop, left, top, dragOffsetX, dragOffsetY
    console.log({
        clientX: ev.clientX,
        clientY: ev.clientY,
        offsetLeft: ev.target.offsetLeft,
        offsetTop: ev.target.offsetTop,
        dragOffsetX: dragOffsetX,
        dragOffsetY: dragOffsetY,
    });
    console.log('newLeft: ' + newLeft + ', newTop: ' + newTop);
    draggedElement.style.left = (newLeft / dragTargetRect.width) * 100 + '%'; //+ 'px'
    draggedElement.style.right = 'unset'; // DELETE testing
    draggedElement.style.top = (newTop / dragTargetRect.height) * 100 + '%'; //+ 'px'
    //dragTarget.appendChild(draggedElement);
};

dragTarget.ondragover = function(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
};
