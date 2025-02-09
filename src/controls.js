export let moveDirection = { x: 0, y: 0 };
export let velocity = { x: 0, y: 0 };
export const maxSpeed = 0.06;
export const acceleration = 0.01;
export const deceleration = 0.02;

const keyState = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

document.addEventListener("keydown", (event) => {
    if (keyState.hasOwnProperty(event.key)) {
        keyState[event.key] = true;
        updateMoveDirection();
    }
});

document.addEventListener("keyup", (event) => {
    if (keyState.hasOwnProperty(event.key)) {
        keyState[event.key] = false;
        updateMoveDirection();
    }
});

function updateMoveDirection() {
    moveDirection.x = (keyState.ArrowRight ? 1 : 0) - (keyState.ArrowLeft ? 1 : 0);
    moveDirection.y = (keyState.ArrowUp ? 1 : 0) - (keyState.ArrowDown ? 1 : 0);
}
