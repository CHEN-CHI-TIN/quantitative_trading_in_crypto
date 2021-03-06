const o = require("./wheel");
const request = require("request");

const email = "<your email>";
const apiKey = "<your apiKey>";
const apiSecret = "<your apiSecret>";
const pairBack = "twd"; //基礎幣種
const timeLoop = 1000 * 15; //更新頻率(毫秒)
const resolution = "30m"; //K線單位
const timeAmount = 10; //資料量(多少時間內)
const timeUnit = "MIN"; //資料量之時間單位
const alligatorRound = 4; //鱷魚線數值之四捨五入至小數點後?位
const amountSize = 1; //每次交易量(1為全部)
const amountRound = 8; //下單量之小數點位數
const goal = 1; //收益超過總資產之?將平倉(%)

const pair_01 = "btc";
const pair_02 = "usdt";
const pair_03 = "eth";

let lockPair = false;
let switchPair_01 = true;
let switchPair_02 = false;
let switchPair_03 = false;
let bear = false;
let bear_01 = false;
let bear_02 = false;
let bear_03 = false;
let buy = false;
let watchBuy = false;
let watchOffsetBuy = false;
let pairFront = "";
let balanceBeforeBuy = 0;

setInterval(() => {
    if (lockPair == false) {
        if (switchPair_01 == true) {
            pairFront = pair_01;
            switchPair_01 = false;
            switchPair_02 = true;
        } else if (switchPair_02 == true) {
            pairFront = pair_02;
            switchPair_02 = false;
            switchPair_03 = true;
        } else if (switchPair_03 == true) {
            pairFront = pair_03;
            switchPair_03 = false;
            switchPair_01 = true;
        }
    }

    //查看帳戶資產
    get(o.optionAccountBalance(apiKey, apiSecret, {
        identity: email,
        nonce: Date.now()
    })).then((resData) => {
        let data = resData["data"];
        let balanceFront = Number(o.getBalance(pairFront, data));
        let balanceBack = Number(o.getBalance(pairBack, data));

        //查看歷史資料，並開始策略
        get(o.optionHistoryData(pair(pairFront, pairBack), resolution, timeAmount, timeUnit)).then((resData) => {
            //使用歷史數據計算相關指標
            let data = resData["data"];
            let fractalUp = o.getFractalUP(o.getHighData(data)); //上分形
            let fractalDown = o.getFractalDown(o.getLowData(data)); //下分形
            let alligator = o.getAlligator(o.getCloseData(data)); //鱷魚線
            let alligatorDown = o.toolRound(alligator["alligatorDown"], alligatorRound); //下巴(SMA13)
            let alligatorMiddel = o.toolRound(alligator["alligatorMiddel"], alligatorRound); //牙齒(SMA8)
            let alligatorUp = o.toolRound(alligator["alligatorUp"], alligatorRound); //上唇(SMA5)
            let alligatorMax = Math.max(alligatorDown, alligatorMiddel, alligatorUp); //鱷魚線最大值
            let alligatorMin = Math.min(alligatorDown, alligatorMiddel, alligatorUp); //鱷魚線最小值
            let currentPrice = alligator["currentPrice"]; //當前價格
            let balanceCurrent = Math.floor(balanceBack + balanceFront * currentPrice); //當前總資產(無條件捨去)

            /**
             * 下巴 > 齒 > 上唇 & 上分形、下分形 < 下巴，處於熊市
             */
            if (alligatorDown > alligatorMiddel && alligatorMiddel > alligatorUp && fractalUp < alligatorDown && fractalDown < alligatorDown) {
                if (pairFront == pair_01) {
                    bear_01 = true;
                } else if (pairFront == pair_02) {
                    bear_02 = true;
                } else if (pairFront == pair_03) {
                    bear_03 = true;
                }
            }
            if (pairFront == pair_01 && bear_01 == true) {
                bear = true;
            } else if (pairFront == pair_02 && bear_02 == true) {
                bear = true;
            } else if (pairFront == pair_03 && bear_03 == true) {
                bear = true;
            } else {
                bear = false;
            }

            // console.log("--------------------------------------------------", "|", Date());
            // console.log("pairFront：", pairFront, "|", "currentPrice：", currentPrice, "|", "bear：", bear);
            // console.log("balanceCurrent：", balanceCurrent, "|", "balanceBeforeBuy：", balanceBeforeBuy);
            // console.log("fractalUp：", fractalUp, "|", "fractalDown：", fractalDown);
            // console.log("alligatorDown：", alligatorDown, "|", "alligatorMiddel：", alligatorMiddel, "|", "alligatorUp：", alligatorUp);

            /**
             * 追蹤多頭平倉之空單
             */
            if (watchOffsetBuy == true) {
                //查看所有合約
                get(o.optionAllOrders(pair(pairFront, pairBack), apiKey, apiSecret, {
                    identity: email,
                    nonce: Date.now()
                })).then((resData) => {
                    //如果尚有空單，刪除漏單並重新下單
                    if (o.hasSellContract(resData["data"]) == true) {
                        //刪除漏單
                        del(o.optionDeleteOrder(apiKey, apiSecret, {
                            identity: email,
                            nonce: Date.now()
                        })).then((resData) => {
                            console.log("--------------------------------------------------", "|", Date());
                            console.log("刪除多頭平倉之漏單");
                            console.log(resData);
                            buy = true; //重新多頭平倉之流程
                            watchOffsetBuy = false;
                        });
                    } else {
                        console.log("--------------------------------------------------", "|", Date());
                        console.log("確認已多頭平倉");
                        watchOffsetBuy = false;
                        lockPair = false; //解除鎖定幣種
                    }
                });
            }

            /**
             * 追蹤做多之多單
             */
            if (watchBuy == true) {
                //查看所有合約
                get(o.optionAllOrders(pair(pairFront, pairBack), apiKey, apiSecret, {
                    identity: email,
                    nonce: Date.now()
                })).then((resData) => {
                    //如果尚有多單，刪除漏單並重新下單
                    if (o.hasBuyContract(resData["data"]) == true) {
                        //刪除漏單
                        del(o.optionDeleteOrder(apiKey, apiSecret, {
                            identity: email,
                            nonce: Date.now()
                        })).then((resData) => {
                            console.log("--------------------------------------------------", "|", Date());
                            console.log("刪除做多之漏單");
                            console.log(resData);
                            buy = false; //重新做多之流程
                            watchBuy = false;
                            lockPair = false; //解除鎖定幣種，使下一循環開始為新幣種
                        });
                    } else {
                        console.log("--------------------------------------------------", "|", Date());
                        console.log("確認已做多");
                        watchBuy = false;
                        lockPair = true; //若已確認做多，鎖定幣種直至平倉
                        bear_01 = false;
                        bear_02 = false;
                        bear_03 = false;
                    }
                });
            }

            /**
             * 收益超過goal，多頭平倉
             */
            if (balanceCurrent - balanceBeforeBuy >= balanceBeforeBuy / 100 * goal && buy == true && watchBuy == false) {
                console.log("--------------------------------------------------", "|", Date());
                console.log("收益超過goal，多頭平倉");
                //平倉要用pairFront賣，使用pairFront資產balanceFront
                let amount = balanceFront * amountSize; //每次購買amountPercent
                amount = o.toolRound(amount, amountRound); //四捨五入至amountRound位
                order("SELL", amount, currentPrice); //下單
                buy = false; //做多結束
                watchOffsetBuy = true; //開始監視平倉之空單
            }

            /**
             * 熊市，多頭平倉
             */
            if (bear == true && buy == true && watchBuy == false) {
                console.log("--------------------------------------------------", "|", Date());
                console.log("熊市，多頭平倉");
                //平倉要用pairFront賣，使用pairFront資產balanceFront
                let amount = balanceFront * amountSize; //每次購買amountPercent
                amount = o.toolRound(amount, amountRound); //四捨五入至amountRound位
                order("SELL", amount, currentPrice); //下單
                buy = false; //做多結束
                watchOffsetBuy = true; //開始監視平倉之空單
            }

            /**
             * 已處於熊市 & 上唇 > 齒 > 下巴 & 上分形、下分形 > 下巴，做多
             */
            if (bear == true && alligatorUp > alligatorMiddel && alligatorMiddel > alligatorDown && fractalUp > alligatorDown && fractalDown > alligatorDown && buy == false) {
                console.log("--------------------------------------------------", "|", Date());
                console.log("已處於熊市 & 上唇 > 齒 > 下巴 & 上分形、下分形 > 下巴，做多");
                //多單要用pairBack買，使用pairBack資產balanceBack
                let amount = balanceBack * amountSize / currentPrice; //每次購買amountPercent，因使用pairFront匯率，故除於currentPrice
                amount = o.toolRound(amount, amountRound); //四捨五入至amountRound位
                order("BUY", amount, currentPrice); //下單
                buy = true; //已做多
                watchBuy = true; //開始監視此多單
                lockPair = true; //鎖定幣種
                balanceBeforeBuy = balanceCurrent;
            }
        });
    });
}, timeLoop);

/**
 * 交易: "BUY", "SELL"
 * @param {string} action
 * @param {number} amount
 * @param {number} price
 */
function order(action, amount, price) {
    post(o.optionCreatOrder(pair(pairFront, pairBack), apiKey, apiSecret, {
        action: action,
        amount: String(amount),
        price: String(price),
        timestamp: Date.parse(new Date()),
        type: "LIMIT"
    })).then((resData) => {
        console.log("--------------------------------------------------", "|", Date());
        console.log(resData);
    });
}

/**
 * @param {string} pairFront
 * @param {string} pairBack
 */
function pair(pairFront, pairBack) {
    return pairFront + "_" + pairBack;
}

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
