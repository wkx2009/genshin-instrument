const instrumentConfig = {
    instruments: [
        {
            id: "windsong_lyre",
            name: "风物之诗琴",
            audioFolder: "风物之诗琴",
            color: "rgb(88, 153, 144)", // 风物之诗琴的颜色
            bg1: "rgb(144, 249, 227)",
            bg2: "rgba(144, 249, 227, 0.8)"
        },
        {
            id: "floral_zither",
            name: "镜花之琴",
            audioFolder: "镜花之琴",
            color: "rgb(173, 159, 146)",
            bg1: "rgb(221, 203, 161)",
            bg2: "rgba(221, 203, 161, 0.8)"
        },
        {
            id: "floral_zither_old",
            name: "镜花之琴(旧版)",
            audioFolder: "镜花之琴(旧版)",
            color: "rgb(173, 159, 146)",
            bg1: "rgb(221, 203, 161)",
            bg2: "rgba(221, 203, 161, 0.8)"
        },
        {
            id: "vintage_lyre",
            name: "老旧的诗琴",
            audioFolder: "老旧的诗琴",
            color: "rgb(127, 179, 99)",
            bg1: "rgb(160, 216, 128)",
            bg2: "rgba(160, 216, 128, 0.8)"
        },
        // 新增乐器配置（颜色已经转为 rgb 格式）
        {
            id: "sound_of_echo",
            name: "余音",
            audioFolder: "余音",
            color: "rgb(139, 125, 219)", // 转换后的颜色
            bg1: "rgb(139, 125, 219)",
            bg2: "rgba(139, 125, 219, 0.8)"
        },
        {
            id: "yuko_zither",
            name: "悠可琴",
            audioFolder: "悠可琴",
            color: "rgb(82, 115, 157)", // 转换后的颜色
            bg1: "rgb(82, 115, 157)",
            bg2: "rgba(82, 115, 157, 0.8)"
        },
        {
            id: "leaping_lute",
            name: "跃律琴",
            audioFolder: "跃律琴",
            color: "rgb(100, 185, 186)", // 转换后的颜色
            bg1: "rgb(100, 185, 186)",
            bg2: "rgba(100, 185, 186, 0.8)"
        }
    ],
    noteMap: {
        "q": "0.mp3", "w": "1.mp3", "e": "2.mp3", "r": "3.mp3", "t": "4.mp3", "y": "5.mp3", "u": "6.mp3",
        "a": "7.mp3", "s": "8.mp3", "d": "9.mp3", "f": "10.mp3", "g": "11.mp3", "h": "12.mp3", "j": "13.mp3",
        "z": "14.mp3", "x": "15.mp3", "c": "16.mp3", "v": "17.mp3", "b": "18.mp3", "n": "19.mp3", "m": "20.mp3"
    },
    getAudioBasePath(instrumentId) {
        const instrument = this.instruments.find(inst => inst.id === instrumentId);
        return instrument 
            ? `./audio/${instrument.audioFolder}/` 
            : `./audio/${this.instruments[0].audioFolder}/`;
    },
    getInstrumentInfo(instrumentId) {
        return this.instruments.find(inst => inst.id === instrumentId) || this.instruments[0];
    },
    getNoteFile(key) {
        return this.noteMap[key] || null;
    }
};
