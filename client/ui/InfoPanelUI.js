// UI para exibir informações contextuais de entidades à frente do player
export class InfoPanelUI {
    constructor() {
        this.panel = document.createElement('div');
        this.panel.id = 'info-panel-ui';
        this.panel.style = `
            position: fixed;
            bottom: 10%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(30,30,30,0.97);
            color: #fff;
            padding: 18px 32px;
            border-radius: 12px;
            font-size: 1.2em;
            z-index: 10050;
            min-width: 220px;
            max-width: 90vw;
            box-shadow: 0 2px 16px #000a;
            display: none;
        `;
        document.body.appendChild(this.panel);
    }

    show(infoHtml) {
        this.panel.innerHTML = infoHtml;
        this.panel.style.display = 'block';
    }

    hide() {
        this.panel.style.display = 'none';
    }
}
