export let moveDirection = { x: 0, y: 0 };
export let velocity = { x: 0, y: 0 };
export const maxSpeed = 0.06;
export const acceleration = 0.01;
export const deceleration = 0.02;

const keyState = { 
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    KeyW: false, KeyS: false, KeyA: false, KeyD: false 
};

document.addEventListener("keydown", (event) => {
    if (keyState.hasOwnProperty(event.key) || keyState.hasOwnProperty(event.code)) {
        if (keyState.hasOwnProperty(event.key)) {
            keyState[event.key] = true;
        }
        if (keyState.hasOwnProperty(event.code)) {
            keyState[event.code] = true;
        }
        updateMoveDirection();
    }
});

document.addEventListener("keyup", (event) => {
    if (keyState.hasOwnProperty(event.key) || keyState.hasOwnProperty(event.code)) {
        if (keyState.hasOwnProperty(event.key)) {
            keyState[event.key] = false;
        }
        if (keyState.hasOwnProperty(event.code)) {
            keyState[event.code] = false;
        }
        updateMoveDirection();
    }
});

function updateMoveDirection() {
    moveDirection.x = (keyState.ArrowRight || keyState.KeyD ? 1 : 0) - (keyState.ArrowLeft || keyState.KeyA ? 1 : 0);
    moveDirection.y = (keyState.ArrowUp || keyState.KeyW ? 1 : 0) - (keyState.ArrowDown || keyState.KeyS ? 1 : 0);
}

// Dev Mode Toggle with backtick key
document.addEventListener("keydown", (event) => {
    if (event.key === '`' || event.key === '~') {
        // Toggle dev mode
        window.devMode = !window.devMode;
        event.preventDefault(); // Prevent any default behavior
    }
});
