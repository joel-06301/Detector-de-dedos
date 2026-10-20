import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';

// Clases globales que vienen de los scripts cargados en index.html
declare const Hands: any;
declare const Camera: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  private hands: any;
  private camera: any;

  async ngAfterViewInit(): Promise<void> {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d')!;

    // 1. Crear y configurar el detector de manos
    this.hands = new Hands({
      locateFile: (f: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`,
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    // 2. Qué hacer con cada resultado (se llama una vez por frame analizado)
    this.hands.onResults((r: any) => {
      // Igualar la resolución del canvas con la del video (solo si cambia,
      // porque asignar width/height borra el contenido)
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Pintar el frame de la cámara
      ctx.drawImage(r.image, 0, 0, canvas.width, canvas.height);

      // Círculo rojo sobre la punta del índice (landmark 8) de cada mano
      r.multiHandLandmarks?.forEach((mano: any) => {
        const punta = mano[8];
        ctx.beginPath();
        ctx.arc(
          punta.x * canvas.width,
          punta.y * canvas.height,
          30,
          0,
          2 * Math.PI
        );
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fill();
      });
    });

    // 3. Cargar el modelo de IA
    await this.hands.initialize();

    // 4. Encender la cámara y enviar cada frame a MediaPipe
    this.camera = new Camera(video, {
      onFrame: async () => await this.hands.send({ image: video }),
      width: 1080,
      height: 1080,
      facingMode: 'user',
    });
    await this.camera.start();
  }

  // Apagar cámara y liberar el modelo al salir de la página
  ngOnDestroy(): void {
    this.camera?.stop();
    this.hands?.close();
  }
}
