let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let width = 640, height = 480;

self.onmessage = (e) => {
    const { type, data } = e.data;

    if (type === "init") {
        const { canvas: offscreen, width: w, height: h } = data;
        if (!offscreen) throw new Error("No OffscreenCanvas provided");
        canvas = offscreen as OffscreenCanvas;
        width = w;
        height = h;

        ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("OffscreenCanvas 2D context not supported");
    }


    if (type === "draw") {
        const { imageBitmap, landmarks, connections } = data;
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(imageBitmap, 0, 0, width, height);

        if (landmarks && landmarks.length) {
            ctx.strokeStyle = "#00FF00";
            ctx.lineWidth = 2;
            for (const [startIdx, endIdx] of connections) {
                const s = landmarks[startIdx];
                const e = landmarks[endIdx];
                ctx.beginPath();
                ctx.moveTo(s.x * width, s.y * height);
                ctx.lineTo(e.x * width, e.y * height);
                ctx.stroke();
            }

            ctx.fillStyle = "#FF0000";
            for (const l of landmarks) {
                ctx.beginPath();
                ctx.arc(l.x * width, l.y * height, 4, 0, 2 * Math.PI);
                ctx.fill();
            }
        }

        imageBitmap.close(); // free GPU memory
    }
};
