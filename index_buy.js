const o = require("./wheel");
const request = require("request");

const email = "timmybrick@icloud.com";
const apiKey = "2a4f6d473376f0dd36baf629bcd1d21b";
const apiSecret = "$2a$12$YW1s2uH1Fpn1rThxfYf9LOSQ53DkVb8VqiT4/rlj/o/RI9TZYHCRi";

const timeLoop = 5000; //更新頻率
const pairFront = "btc";
const pairBack = "twd";
const pair = pairFront + "_" + pairBack;
const resolution = "5m";
const timeAmount = 20;
const timeUnit = "SEC";
const alligatorRound = 4; //鱷魚線數值之四捨五入至小數點後?位
const amountPercent = 1; //每次交易量(%)

let amountRound = 0;
let lastBuyAmount = 0;
let buy = false;
let watchBuy = false;
let watchOffsetBuy = false;
let sumBuy = 0;
let totalBalance = {};

if (pairFront == "usdt") amountRound = 3;
if (pairFront == "btc") amountRound = 8;

setInterval(() => {
    //計算總資產
    getTotalBalance();

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
        console.log("資料量：", data.length, "|", "是否已做多：", buy, "|", "總做多次數：", sumBuy);
        console.log("鱷魚下巴_SMA13：", alligatorDown, "|", "鱷魚牙齒_SMA8：", alligatorMiddel, "|", "鱷魚上唇_SMA5：", alligatorUp, "|", "上分形：", fractalUp, "|", "下分形：", fractalDown);
        console.log("當前價格：", currentPrice);
        console.log("總資產：", totalBalance["total"], "|", `${pairFront}：`, totalBalance["front"], "|", `${pairBack}：`, totalBalance["back"]);

        /**
         * 追蹤多頭平倉
         */
        if (watchOffsetBuy == true) {
            //查看所有合約
            get(o.optionAllOrders(pair, apiKey, apiSecret, {
                identity: email,
                nonce: Date.now()
            })).then((resData) => {
                //如果尚有空單，刪除漏單並重新平倉
                if (o.hasSellContract(resData["data"]) == true) {
                    //刪除
                    del(o.optionDeleteOrder(apiKey, apiSecret, {
                        identity: email,
                        nonce: Date.now()
                    })).then((resData) => {
                        console.log("刪除多頭平倉之漏單");
                        console.log(resData);
                        //下單
                        post(o.optionCreatOrder(pair, apiKey, apiSecret, {
                            action: "SELL",
                            amount: String(lastBuyAmount),
                            price: String(currentPrice),
                            timestamp: Date.parse(new Date()),
                            type: "LIMIT"
                        })).then((resData) => {
                            console.log("重新多頭平倉");
                            console.log(resData);
                        });
                    });
                } else {
                    console.log("確認已多頭平倉");
                    watchOffsetBuy = false;
                    sumBuy++;
                }
            });
        }

        /**
         * 追蹤做多
         */
        if (watchBuy == true) {
            //查看所有合約
            get(o.optionAllOrders(pair, apiKey, apiSecret, {
                identity: email,
                nonce: Date.now()
            })).then((resData) => {
                //如果尚有多單，刪除漏單並重新做多
                if (o.hasBuyContract(resData["data"]) == true) {
                    //刪除
                    del(o.optionDeleteOrder(apiKey, apiSecret, {
                        identity: email,
                        nonce: Date.now()
                    })).then((resData) => {
                        console.log("刪除做多之漏單");
                        console.log(resData);
                        //下單
                        post(o.optionCreatOrder(pair, apiKey, apiSecret, {
                            action: "BUY",
                            amount: String(lastBuyAmount),
                            price: String(currentPrice),
                            timestamp: Date.parse(new Date()),
                            type: "LIMIT"
                        })).then((resData) => {
                            console.log("重新做多");
                            console.log(resData);
                        });
                    });
                } else {
                    console.log("確認已做多");
                    watchBuy = false;
                }
            });
        }

        /**
         * 上唇 < 齒，多頭平倉
         */
        if (alligatorUp < alligatorMiddel && buy == true && watchBuy == false) {
            post(o.optionCreatOrder(pair, apiKey, apiSecret, {
                action: "SELL",
                amount: String(lastBuyAmount),
                price: String(currentPrice),
                timestamp: Date.parse(new Date()),
                type: "LIMIT"
            })).then((resData) => {
                console.log("多頭平倉");
                console.log(resData);
                buy = false;
                watchOffsetBuy = true;
            });
        }

        /**
         * 上唇 > 齒 > 下巴 & 下分形 > 下巴，為相對低點；做多
         */
        if (alligatorUp > alligatorMiddel && alligatorMiddel > alligatorDown && fractalDown > alligatorDown && buy == false) {
            //多單要用pairBack買，所以先查看pairBack資產
            get(o.optionAccountBalance(apiKey, apiSecret, {
                identity: email,
                nonce: Date.now()
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
                    console.log("做多");
                    console.log(resData);
                    buy = true;
                    watchBuy = true;
                });
            });
        }

        /**
         * 上唇 > 齒 > 下巴 & 當前價格 > 上分形，為強升趨勢；做多
         */
        if (alligatorUp > alligatorMiddel && alligatorMiddel > alligatorDown && currentPrice > fractalUp && buy == false) {
            //多單要用pairBack買，所以先查看pairBack資產
            get(o.optionAccountBalance(apiKey, apiSecret, {
                identity: email,
                nonce: Date.now()
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
                    console.log("做多");
                    console.log(resData);
                    buy = true;
                    watchBuy = true;
                });
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

/**
 * 計算總資產，更動totalBalance
 */
function getTotalBalance() {
    //查看帳戶資產
    get(o.optionAccountBalance(apiKey, apiSecret, {
        identity: email,
        nonce: Date.now()
    })).then((resData) => {
        let data = resData["data"];
        let balanceFront = Number(o.getBalance(pairFront, data));
        let balanceBack = Number(o.getBalance(pairBack, data));
        //查看當前匯率
        get(o.optionHistoryData(pair, resolution, timeAmount, timeUnit)).then((resData) => {
            let data = resData["data"];
            let currentPrice = Number(data[data.length - 1]["close"]);
            totalBalance = {
                total: Math.round(balanceBack + balanceFront * currentPrice),
                front: balanceFront,
                back: balanceBack
            }
        });
    });
}