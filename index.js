const o = require("./wheel");
const request = require("request");

const email = "timmybrick@icloud.com";
const apiKey = "2a4f6d473376f0dd36baf629bcd1d21b";
const apiSecret = "$2a$12$YW1s2uH1Fpn1rThxfYf9LOSQ53DkVb8VqiT4/rlj/o/RI9TZYHCRi";

const timeLoop = 5000; //更新頻率
const pairFront = "usdt";
const pairBack = "twd";
const pair = pairFront + "_" + pairBack;
const resolution = "5m";
const timeAmount = 20;
const timeUnit = "SEC";
const alligatorRound = 4; //鱷魚線數值之四捨五入至小數點後?位
const amountPercent = 0.7; //每次交易量(%)
const amountRound = 3; //交易量深度(USDT:3)

let nonce = 0;
let lastBuyAmount = 0;
let lastSellAmount = 0;
let switchBuy = false;
let switchSell = false;
let sumBuy = 0;
let sumSell = 0;

setInterval(() => {
    //查看歷史資料，並開始策略
    get(o.optionHistoryData(pair, resolution, timeAmount, timeUnit)).then((resData) => {
        let data = resData["data"];
        let fractalUp = o.getFractalUP(o.getHighData(data));
        let fractalDown = o.getFractalDown(o.getLowData(data));
        let alligator = o.getAlligator(o.getCloseData(data));
        let alligatorDown = o.toolRound(alligator["alligatorDown"], alligatorRound);
        let alligatorMiddel = o.toolRound(alligator["alligatorMiddel"], alligatorRound);
        let alligatorUp = o.toolRound(alligator["alligatorUp"], alligatorRound);
        let currentPrice = alligator["currentPrice"];

        console.log("--------------------------------------------------------------------------------------------------------------------", Date());
        console.log("資料量：", data.length, "|", "是否已做多：", switchBuy, "|", "是否已做空：", switchSell, "|", "總做多次數：", sumBuy, "|", "總做空次數：", sumSell);
        console.log("鱷魚下巴_SMA13：", alligatorDown, "|", "鱷魚牙齒_SMA8：", alligatorMiddel, "|", "鱷魚上唇_SMA5：", alligatorUp, "|", "上分形：", fractalUp, "|", "下分形：", fractalDown);
        console.log("當前價格：", currentPrice);

        /**
         * 上唇 < 齒，多頭平倉
         */
        if (alligatorUp < alligatorMiddel && switchBuy == true) {
            post(o.optionCreatOrder(pair, apiKey, apiSecret, {
                action: "SELL",
                amount: String(lastBuyAmount),
                price: String(currentPrice),
                timestamp: Date.parse(new Date()),
                type: "LIMIT"
            })).then((resData) => {
                console.log(resData);
                switchBuy = false;
                sumBuy++;
            });
        }

        /**
         * 上唇 > 齒，空頭平倉
         */
        if (alligatorUp > alligatorMiddel && switchSell == true) {
            post(o.optionCreatOrder(pair, apiKey, apiSecret, {
                action: "BUY",
                amount: String(lastSellAmount),
                price: String(currentPrice),
                timestamp: Date.parse(new Date()),
                type: "LIMIT"
            })).then((resData) => {
                console.log(resData);
                switchSell = false;
                sumSell++;
            });
        }

        /**
         * 上唇 > 齒 > 下巴 & 下分形 > 上唇，為相對低點；做多
         */
        if (alligatorUp > alligatorMiddel && alligatorMiddel > alligatorDown && fractalDown > alligatorDown) {
            //查看所有合約
            nonce = Date.now();
            get(o.optionAllOrders(pair, apiKey, apiSecret, {
                identity: email,
                nonce
            })).then((resData) => {
                //如果已經做多，但還有多單，則取消所有交易，再次購買（為避免漏單）
                if (switchBuy == true && o.hasBuyContract(resData["data"]) == true) {
                    nonce = Date.now();
                    del(o.optionDeleteOrder(apiKey, apiSecret, {
                        identity: email,
                        nonce
                    })).then((resData) => {
                        console.log(resData);
                    });
                    switchBuy = false;
                }
                //如果尚未做多，且無多單，開始交易
                if (switchBuy == false && o.hasBuyContract(resData["data"]) == false) {
                    //多單要用台幣買，所以先查看台幣資產
                    nonce = Date.now();
                    get(o.optionAccountBalance(apiKey, apiSecret, {
                        identity: email,
                        nonce
                    })).then((resData) => {
                        let data = resData["data"];
                        let balanceBack = Number(o.getBalance(pairBack, data));
                        let amount = balanceBack * amountPercent / currentPrice; //每次購買?%
                        amount = o.toolRound(amount, amountRound);
                        lastBuyAmount = amount;
                        //購買
                        post(o.optionCreatOrder(pair, apiKey, apiSecret, {
                            action: "BUY",
                            amount: String(amount),
                            price: String(currentPrice),
                            timestamp: Date.parse(new Date()),
                            type: "LIMIT"
                        })).then((resData) => {
                            console.log(resData);
                            switchBuy = true;
                        });
                    });
                }
            });
        }

        /**
         * 下巴 > 齒 > 上唇 & 上分形 < 上唇，為相對高點；做空
         */
        if (alligatorDown > alligatorMiddel && alligatorMiddel > alligatorUp && fractalUp < alligatorDown) {
            //查看所有合約
            nonce = Date.now();
            get(o.optionAllOrders(pair, apiKey, apiSecret, {
                indentity: email,
                nonce
            })).then((resData) => {
                //如果已經做空，但還有空單，則取消所有交易，再次賣出（為避免漏單）
                if (switchSell == true && o.hasSellContract(resData["data"]) == true) {
                    nonce = Date.now();
                    del(o.optionDeleteOrder(apiKey, apiSecret, {
                        identity: email,
                        nonce
                    })).then((resData) => {
                        console.log(resData);
                    });
                    switchSell = false;
                }
                //如果尚未做空，且無空單，開始交易
                if (switchSell == false && o.hasSellContract(resData["data"]) == false) {
                    //空單要用美金賣，所以先查看美金資產
                    nonce = Date.now();
                    get(o.optionAccountBalance(apiKey, apiSecret, {
                        identity: email,
                        nonce
                    })).then((resData) => {
                        let data = resData["data"];
                        let balanceFront = Number(o.getBalance(pairFront, data));
                        let amount = balanceFront * amountPercent; //每次購買?%
                        amount = o.toolRound(amount, amountRound);
                        lastSellAmount = amount;
                        //賣出
                        post(o.optionCreatOrder(pair, apiKey, apiSecret, {
                            action: "SELL",
                            amount: String(amount),
                            price: String(currentPrice),
                            timestamp: Date.parse(new Date()),
                            type: "LIMIT"
                        })).then((resData) => {
                            console.log(resData);
                            switchSell = true;
                        });
                    });
                }
            });
        }
    });
}, timeLoop);

async function get(option) {
    return await new Promise((resolve, reject) => {
        request.get(
            option,
            (error, response, body) => {
                resolve(JSON.parse(body, 0, 2));
            }
        );
    });
}

async function post(option) {
    return await new Promise((resolve, reject) => {
        request.post(
            option,
            (error, response, body) => {
                resolve(JSON.parse(body, 0, 2));
            }
        );
    });
}

async function del(option) {
    return await new Promise((resolve, reject) => {
        request.delete(
            option,
            (error, response, body) => {
                resolve(JSON.parse(body, 0, 2));
            }
        );
    });
}