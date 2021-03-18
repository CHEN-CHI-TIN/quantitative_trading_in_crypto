const o = require("./wheel");
const request = require("request");

const email = "timmybrick@icloud.com";
const apiKey = "2a4f6d473376f0dd36baf629bcd1d21b";
const apiSecret = "$2a$12$YW1s2uH1Fpn1rThxfYf9LOSQ53DkVb8VqiT4/rlj/o/RI9TZYHCRi";
const pairBack = "twd"; //基礎幣種
const timeLoop_single = 5000; //單幣種更新頻率(毫秒)
const timeLoop_All = 10000; //總更新頻率(毫秒)
const resolution = "30m"; //K線單位
const timeAmount = 10; //資料量(多少時間內)
const timeUnit = "MIN"; //資料量之時間單位
const alligatorRound = 4; //鱷魚線數值之四捨五入至小數點後?位
const amountPercent = 1; //每次交易量(%)

//幣種
const pair_01 = "btc";
const pair_02 = "usdt";
const pair_03 = "bcd";
const pair_04 = "bch";
const pair_05 = "bchsv";
const pair_06 = "bito";
const pair_07 = "bnb";
const pair_08 = "cgp";
const pair_09 = "eos";
const pair_10 = "eth";
const pair_11 = "ltc";
const pair_12 = "paxg";
const pair_13 = "trx";
const pair_14 = "xaut";
const pair_15 = "xrp";
const pair_16 = "yfi";

/**
 * 下單量之小數點位數
 * @param {string} pairFront
 */
const amountRound = (pairFront) => {
    if (pairFront == pair_01) return 8;
    if (pairFront == pair_02) return 3;
    if (pairFront == pair_03) return 3;
    if (pairFront == pair_04) return 4;
    if (pairFront == pair_05) return 4;
    if (pairFront == pair_06) return 3;
    if (pairFront == pair_07) return 4;
    if (pairFront == pair_08) return 3;
    if (pairFront == pair_09) return 3;
    if (pairFront == pair_10) return 4;
    if (pairFront == pair_11) return 4;
    if (pairFront == pair_12) return 5;
    if (pairFront == pair_13) return 3;
    if (pairFront == pair_14) return 5;
    if (pairFront == pair_15) return 3;
    if (pairFront == pair_16) return 6;
}

//幣種切換
let lockPair = false;
let switchPair_01 = true;
let switchPair_02 = false;
let switchPair_03 = false;
let switchPair_04 = false;
let switchPair_05 = false;
let switchPair_06 = false;
let switchPair_07 = false;
let switchPair_08 = false;
let switchPair_09 = false;
let switchPair_10 = false;
let switchPair_11 = false;
let switchPair_12 = false;
let switchPair_13 = false;
let switchPair_14 = false;
let switchPair_15 = false;
let switchPair_16 = false;

let pairFront = "";
let buy = false;
let watchBuy = false;
let watchOffsetBuy = false;
let sumBuy = 0;

setInterval(() => {
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
                switchPair_04 = true;
            } else if (switchPair_04 == true) {
                pairFront = pair_04;
                switchPair_04 = false;
                switchPair_05 = true;
            } else if (switchPair_05 == true) {
                pairFront = pair_05;
                switchPair_05 = false;
                switchPair_06 = true;
            } else if (switchPair_06 == true) {
                pairFront = pair_06;
                switchPair_06 = false;
                switchPair_07 = true;
            } else if (switchPair_07 == true) {
                pairFront = pair_07;
                switchPair_07 = false;
                switchPair_08 = true;
            } else if (switchPair_08 == true) {
                pairFront = pair_08;
                switchPair_08 = false;
                switchPair_09 = true;
            } else if (switchPair_09 == true) {
                pairFront = pair_09;
                switchPair_09 = false;
                switchPair_10 = true;
            } else if (switchPair_10 == true) {
                pairFront = pair_10;
                switchPair_10 = false;
                switchPair_11 = true;
            } else if (switchPair_11 == true) {
                pairFront = pair_11;
                switchPair_11 = false;
                switchPair_12 = true;
            } else if (switchPair_12 == true) {
                pairFront = pair_12;
                switchPair_12 = false;
                switchPair_13 = true;
            } else if (switchPair_13 == true) {
                pairFront = pair_13;
                switchPair_13 = false;
                switchPair_14 = true;
            } else if (switchPair_14 == true) {
                pairFront = pair_14;
                switchPair_14 = false;
                switchPair_15 = true;
            } else if (switchPair_15 == true) {
                pairFront = pair_15;
                switchPair_15 = false;
                switchPair_16 = true;
            } else if (switchPair_16 == true) {
                pairFront = pair_16;
                switchPair_16 = false;
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
                let currentPrice = alligator["currentPrice"]; //當前價格
                let totalBalance = Math.round(balanceBack + balanceFront * currentPrice);

                console.log("----------------------------------------------------------------------------------------------------------");
                console.log(Date());
                console.log("當前貨幣對：", pair(pairFront, pairBack), "|", "資料量：", data.length, "|", "是否已做多：", buy, "|", "總做多次數：", sumBuy);
                console.log("鱷魚下巴_SMA13：", alligatorDown, "|", "鱷魚牙齒_SMA8：", alligatorMiddel, "|", "鱷魚上唇_SMA5：", alligatorUp);
                console.log("當前價格：", currentPrice, "|", "上分形：", fractalUp, "|", "下分形：", fractalDown);
                console.log("總資產：", totalBalance, "|", `${pairFront}：`, balanceFront, "|", `${pairBack}：`, balanceBack);

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
                                console.log("刪除多頭平倉之漏單");
                                console.log(resData);
                                buy = true; //重新多頭平倉之流程
                                watchOffsetBuy = false;
                            });
                        } else {
                            console.log("確認已多頭平倉");
                            watchOffsetBuy = false;
                            sumBuy++;
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
                                console.log("刪除做多之漏單");
                                console.log(resData);
                                buy = false; //重新做多之流程
                                watchBuy = false;
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
                    console.log("上唇 < 齒，多頭平倉");
                    //平倉要用pairFront賣，使用pairFront資產balanceFront
                    let amount = balanceFront * amountPercent; //每次購買amountPercent
                    amount = o.toolRound(amount, amountRound(pairFront)); //四捨五入至amountRound位
                    order("SELL", amount, currentPrice); //下單
                    buy = false; //做多結束
                    watchOffsetBuy = true; //開始監視平倉之空單
                }

                /**
                 * 上唇 > 齒 > 下巴 & 下分形 > 下巴，為相對低點；做多
                 */
                if (alligatorUp > alligatorMiddel && alligatorMiddel > alligatorDown && fractalDown > alligatorDown && buy == false) {
                    console.log("上唇 > 齒 > 下巴 & 下分形 > 下巴，為相對低點；做多");
                    //多單要用pairBack買，使用pairBack資產balanceBack
                    let amount = balanceBack * amountPercent / currentPrice; //每次購買amountPercent，因使用pairFront匯率，故除於currentPrice
                    amount = o.toolRound(amount, amountRound(pairFront)); //四捨五入至amountRound位
                    order("BUY", amount, currentPrice); //下單
                    buy = true; //已做多
                    watchBuy = true; //開始監視此多單
                    lockPair = true; //鎖定幣種
                }

                /**
                 * 上唇 > 齒 > 下巴 & 當前價格 > 上分形，為強升趨勢；做多
                 */
                if (alligatorUp > alligatorMiddel && alligatorMiddel > alligatorDown && currentPrice > fractalUp && buy == false) {
                    console.log("上唇 > 齒 > 下巴 & 當前價格 > 上分形，為強升趨勢；做多");
                    //多單要用pairBack買，使用pairBack資產balanceBack
                    let amount = balanceBack * amountPercent / currentPrice; //每次購買amountPercent，因使用pairFront匯率，故除於currentPrice
                    amount = o.toolRound(amount, amountRound(pairFront)); //四捨五入至amountRound位
                    order("BUY", amount, currentPrice); //下單
                    buy = true; //已做多
                    watchBuy = true; //開始監視此多單
                    lockPair = true; //鎖定幣種
                }
            });
        });
    }, timeLoop_single);
}, timeLoop_All);

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