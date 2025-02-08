export class Game {
    private isRunning: boolean;
    private scene: MainScene;

    constructor() {
        this.isRunning = false;
        this.scene = new MainScene();
    }

    public startGame(): void {
        this.isRunning = true;
        this.scene.init();
        this.gameLoop();
    }

    private gameLoop(): void {
        if (!this.isRunning) return;

        this.update();
        this.render();

        requestAnimationFrame(() => this.gameLoop());
    }

    private update(): void {
        this.scene.update();
    }

    private render(): void {
        this.scene.render();
    }

    public stopGame(): void {
        this.isRunning = false;
    }
}