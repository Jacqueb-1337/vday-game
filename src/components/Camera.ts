class Camera {
    constructor(width, height) {
        this.camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 1000);
        this.camera.position.set(0, 0, 10);
        this.zoomLevel = 1;
        this.camera.zoom = this.zoomLevel;
        this.camera.updateProjectionMatrix();
    }

    setPosition(x, y) {
        this.camera.position.set(x, y, this.camera.position.z);
    }

    setZoom(zoomLevel) {
        this.zoomLevel = zoomLevel;
        this.camera.zoom = this.zoomLevel;
        this.camera.updateProjectionMatrix();
    }

    getCamera() {
        return this.camera;
    }
}