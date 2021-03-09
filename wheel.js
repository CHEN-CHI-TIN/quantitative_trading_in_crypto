const talib = require("talib-binding");
const crypto = require("crypto");

const XBITOPRO = (apiKey, apiSecret, body) => {
    let payload = new Buffer(JSON.stringify(body)).toString('base64');
    let signature = crypto
        .createHmac("sha384", apiSecret)
        .update(payload)
        .digest("hex");

    return {
        "X-BITOPRO-APIKEY": apiKey,
        "X-BITOPRO-PAYLOAD": payload,
        "X-BITOPRO-SIGNATURE": signature
    }
}

module.exports = {
    /**
     * @param {string} apiKey
     * @param {string} apiSecret
     * @param {object} body
     */
    optionAccountBalance: (apiKey, apiSecret, body) => {
        return {
            url: "https://api.bitopro.com/v3/accounts/balance",
            headers: XBITOPRO(apiKey, apiSecret, body)
        }
    },
    /**
     * @param {string} pair
     * @param {string} apiKey
     * @param {string} apiSecret
     * @param {object} body
     */
    optionAllOrders: (pair, apiKey, apiSecret, body) => {
        return {
            url: `https://api.bitopro.com/v3/orders/${pair}`,
            headers: XBITOPRO(apiKey, apiSecret, body)
        }
    },
    /**
     * @param {string} pair
     * @param {string} apiKey
     * @param {string} apiSecret
     * @param {object} body
     */
    optionCreatOrder: (pair, apiKey, apiSecret, body) => {
        return {
            url: `https://api.bitopro.com/v3/orders/${pair}`,
            headers: XBITOPRO(apiKey, apiSecret, body),
            body: JSON.stringify(body)
        }
    },
    /**
     * @param {string} apiKey 
     * @param {string} apiSecret 
     * @param {object} body 
     */
    optionDeleteOrder: (apiKey, apiSecret, body) => {
        return {
            url: "https://api.bitopro.com/v3/orders/all",
            headers: XBITOPRO(apiKey, apiSecret, body),
            body: JSON.stringify(body)
        }
    },
    /**
     * 貨幣對, 蠟燭頻率, 時間數量, 時間單位("SEC", "MIN", "HOUR")
     * @param {string} pair
     * @param {string} resolution
     * @param {number} timeAmount
     * @param {string} timeUnit
     */
    optionHistoryData: (pair, resolution, timeAmount, timeUnit) => {
        let timeTo = Date.parse(new Date()) / 1000;
        let timeFrom = 0;
        if (timeUnit === "SEC") {
            timeFrom = timeTo - timeAmount * 1000;
        } else if (timeUnit === "MIN") {
            timeFrom = timeTo - timeAmount * 60000;
        } else if (timeUnit === "HOUR") {
            timeFrom = timeTo - timeAmount * 3600000;
        }
        return {
            url: `https://api.bitopro.com/v3/trading-history/${pair}?resolution=${resolution}&from=${timeFrom}&to=${timeTo}`
        }
    },
    /**
     * @param {array} data
     */
    getHighData: (data) => {
        let result = [];
        i = 0;
        while (i <= data.length - 1) {
            result[i] = Number(data[i]["high"]);
            i++;
        }
        return result
    },
    /**
     * @param {array} data
     */
    getLowData: (data) => {
        let result = [];
        i = 0;
        while (i <= data.length - 1) {
            result[i] = Number(data[i]["low"]);
            i++;
        }
        return result
    },
    /**
     * @param {array} data
     */
    getCloseData: (data) => {
        let result = [];
        i = 0;
        while (i <= data.length - 1) {
            result[i] = Number(data[i]["close"]);
            i++;
        }
        return result
    },
    /**
     * 鱷魚線
     * @param {array} closeData
     */
    getAlligator: (closeData) => {
        let sma13 = talib.SMA(closeData, 13);
        let sma8 = talib.SMA(closeData, 8);
        let sma5 = talib.SMA(closeData, 5);
        return {
            alligatorDown: sma13[sma13.length - 9],
            alligatorMiddel: sma8[sma8.length - 6],
            alligatorUp: sma5[sma5.length - 4],
            currentPrice: closeData[closeData.length - 1]
        }
    },
    /**
     * 上分形
     * @param {array} highData
     */
    getFractalUP: (highData) => {
        let fractalUp = [];
        for (var i = 8; i < highData.length - 1; i++) {
            if (highData[i - 1] < highData[i - 2] && highData[i] < highData[i - 2]) {
                // Fractal type 1
                if (highData[i - 4] < highData[i - 2] &&
                    highData[i - 3] < highData[i - 2])
                    fractalUp[i + 1] = highData[i - 2];
        
                // Fractal type 2
                if (highData[i - 5] < highData[i - 2] &&
                    highData[i - 4] < highData[i - 2] &&
                    highData[i - 3] == highData[i - 2])
                    fractalUp[i + 1] = highData[i - 2];
        
                // Fractal type 3, 4
                if (highData[i - 6] < highData[i - 2] &&
                    highData[i - 5] < highData[i - 2] &&
                    highData[i - 4] == highData[i - 2] &&
                    highData[i - 3] <= highData[i - 2])
                    fractalUp[i + 1] = highData[i - 2];
        
                // Fractal type 5
                if (highData[i - 7] < highData[i - 2] &&
                    highData[i - 6] < highData[i - 2] &&
                    highData[i - 5] == highData[i - 2] &&
                    highData[i - 4] < highData[i - 2] &&
                    highData[i - 3] == highData[i - 2])
                    fractalUp[i + 1] = highData[i - 2];
        
                // Fractal type 6
                if (highData[i - 7] < highData[i - 2] &&
                    highData[i - 6] < highData[i - 2] &&
                    highData[i - 5] == highData[i - 2] &&
                    highData[i - 4] == highData[i - 2] &&
                    highData[i - 3] < highData[i - 2])
                    fractalUp[i + 1] = highData[i - 2];
        
                // Fractal type 7
                if (highData[i - 8] < highData[i - 2] &&
                    highData[i - 7] < highData[i - 2] &&
                    highData[i - 6] == highData[i - 2] &&
                    highData[i - 5] < highData[i - 2] &&
                    highData[i - 4] == highData[i - 2] &&
                    highData[i - 3] < highData[i - 2])
                    fractalUp[i + 1] = highData[i - 2];
            }
        }
        fractalUp = fractalUp.filter(e => e != undefined);
        return fractalUp[fractalUp.length - 1];
    },
    /**
     * 下分形
     * @param {array} lowData
     */
    getFractalDown: (lowData) => {
        let fractalDown = [];
        for (var i = 8; i < lowData.length - 1; i++) {
            if (lowData[i - 1] > lowData[i - 2] && lowData[i] > lowData[i - 2]) {
                // Fractal type 1
                if (lowData[i - 4] > lowData[i - 2] &&
                    lowData[i - 3] > lowData[i - 2])
                    fractalDown[i + 1] = lowData[i - 2];
        
                // Fractal type 2
                if (lowData[i - 5] > lowData[i - 2] &&
                    lowData[i - 4] > lowData[i - 2] &&
                    lowData[i - 3] == lowData[i - 2])
                    fractalDown[i + 1] = lowData[i - 2];
        
                // Fractal type 3, 4
                if (lowData[i - 6] > lowData[i - 2] &&
                    lowData[i - 5] > lowData[i - 2] &&
                    lowData[i - 4] == lowData[i - 2] &&
                    lowData[i - 3] >= lowData[i - 2])
                    fractalDown[i + 1] = lowData[i - 2];
        
                // Fractal type 5
                if (lowData[i - 7] > lowData[i - 2] &&
                    lowData[i - 6] > lowData[i - 2] &&
                    lowData[i - 5] == lowData[i - 2] &&
                    lowData[i - 4] > lowData[i - 2] &&
                    lowData[i - 3] == lowData[i - 2])
                    fractalDown[i + 1] = lowData[i - 2];
        
                // Fractal type 6
                if (lowData[i - 7] > lowData[i - 2] &&
                    lowData[i - 6] > lowData[i - 2] &&
                    lowData[i - 5] == lowData[i - 2] &&
                    lowData[i - 4] == lowData[i - 2] &&
                    lowData[i - 3] > lowData[i - 2])
                    fractalDown[i + 1] = lowData[i - 2];
        
                // Fractal type 7
                if (lowData[i - 8] > lowData[i - 2] &&
                    lowData[i - 7] > lowData[i - 2] &&
                    lowData[i - 6] == lowData[i - 2] &&
                    lowData[i - 5] > lowData[i - 2] &&
                    lowData[i - 4] == lowData[i - 2] &&
                    lowData[i - 3] > lowData[i - 2])
                    fractalDown[i + 1] = lowData[i - 2];
            }
        }
        fractalDown = fractalDown.filter(e => e != undefined);
        return fractalDown[fractalDown.length - 1];
    },
    /**
     * @param {string} currency
     * @param {array} data
     */
    getBalance: (currency, data) => {
        i = 0;
        while (i <= data.length - 1) {
            if (data[i]["currency"] == currency) {
                return data[i]["amount"]
            }
            i++
        }
    },
    /**
     * @param {object} data
     */
    hasBuyContract: (data) => {
        if (data != null) {
            i = 0;
            while (i <= data.length - 1) {
                if (data[i]["action"] == "BUY") {
                    if (data[i]["status"] == -1 || data[i]["status"] == 0 || data[i]["status"] == 1) {
                        return true
                    }
                }
                i++
            }
            return false
        } else {
            return false
        }
    },
    /**
     * @param {object} data
     */
    hasSellContract: (data) => {
        if (data != null) {
            i = 0;
            while (i <= data.length - 1) {
                if (data[i]["action"] == "SELL") {
                    if (data[i]["status"] == -1 || data[i]["status"] == 0 || data[i]["status"] == 1) {
                        return true
                    }
                }
                i++
            }
            return false
        } else {
            return false
        }
    },
    /**
     * 四捨五入
     * ex: toolRound(1.1234, 2) ==>> 1.12
     * @param {number} num
     * @param {number} round 
     */
    toolRound: (num, round) => {
        let r = 10**round;
        return Math.round(num * r) / r
    }
}