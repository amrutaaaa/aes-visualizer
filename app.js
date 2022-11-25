const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

var Sbox = new Array(99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,
    118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,
    147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,
    7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,
    47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,
    251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,
    188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,
    100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,
    50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,
    78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,
    116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,
    158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,
    137,13,191,230,66,104,65,153,45,15,176,84,187,22);

const allowed_letters = ["0", "1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"];
const binVal = ["0000", "0001", "0010", "0011", "0100", "0101", "0110", "0111", "1000", "1001", "1010", "1011", "1100", "1101", "1110", "1111"];
const roundConstants=["00","01", "02", "04","08","10", "20","40","80", "1b","36"]
const empty_string="                                ";
let nextInput=[];
let nextKey=[];
let resArray=[];
let subResult=[];
let shiftResult = [];
let colMixRes=[];
let round=0;
let eightBitKey=[];
let keyReset=[];
let inputReset=[];

function hexToInt(hexString){
    return allowed_letters.indexOf(hexString);
}

function intToHex(intVal){
    let firstLetter = Math.floor(intVal/16);
    let secondLetter = intVal%16;
    return (allowed_letters[firstLetter]+allowed_letters[secondLetter]);
}

function hexToBin(hexString){
    return binVal[allowed_letters.indexOf(hexString)];
}

function binToHex(binString){
    return allowed_letters[binVal.indexOf(binString)];
}

function makeBinString(val){
    let firstHalf = hexToBin(val[0]);
    let secondHalf = hexToBin(val[1]);
    return (firstHalf + secondHalf);
}

function mixColumnsTwo(hexVal){
    let binaryString = makeBinString(hexVal);
    let valArray = binaryString.split("");
    let firstIndex = valArray[0];
    valArray.shift();
    valArray.push("0");
    if (firstIndex=="1"){
        let changeArray = [3,4,6,7];
        for (let a=0; a<4; a++){
            valArray[changeArray[a]]= (parseInt(valArray[changeArray[a]])^1).toString();
        }
    }
    let answerBin=valArray.join("");
    return (binToHex(answerBin.slice(0,4)) + binToHex(answerBin.slice(4,8)));

}

function mixColumnsThree(hexVal){
    let resArray=[];
    let xMul = mixColumnsTwo(hexVal); 
    let binaryStringTwo = makeBinString(xMul);
    let xMulArray = binaryStringTwo.split("");
    let binaryStringOne = makeBinString(hexVal);
    let valArray = binaryStringOne.split("");
    for (let j=0; j<valArray.length; j++){
        resArray.push((parseInt(valArray[j])^parseInt(xMulArray[j])).toString())
    }
    let answerBin = resArray.join("");
    return (binToHex(answerBin.slice(0,4)) + binToHex(answerBin.slice(4,8)));
}

function roundKeyXor(){
    resArray=[];

    for (let p=0; p<16; p++){
        let intInput = hexToInt(nextInput[p][0])*16+hexToInt(nextInput[p][1]);
        let intKey = hexToInt(nextKey[p][0])*16+hexToInt(nextKey[p][1]);
        let roundRes = intInput^intKey;
        resArray.push(intToHex(roundRes));
    }
    
    return resArray
}

function substitutionPage(resArray){
    subResult =[];
    for (let i=0;i<16;i++){
        calcVal = hexToInt(resArray[i][0])*16+hexToInt(resArray[i][1]);
        returnVal = Sbox[calcVal];
        subResult.push(intToHex(returnVal));
    }

    return subResult;
}

function shiftRowsPage(subResult){
    shiftResult=[];
    for (let k=0; k<13; k=k+4){
        shiftResult.push(subResult[k]);
        shiftResult.push(subResult[(k+5)%16]);
        shiftResult.push(subResult[(k+10)%16]);
        shiftResult.push(subResult[(k+15)%16]);
    }
    
    return shiftResult;
}

function mixColumnPage(shiftResult){
    colMixRes=[];
    mulMatrix = [2,3,1,1,1,2,3,1,1,1,2,3,3,1,1,2];
    for (let m=0;m<16;m++){
        let xorVal = 0;
        let row = m%4;
        let column = Math.floor(m/4);
        for (let y=0; y<4; y++){
            firstVal=mulMatrix[((row*4)+y)];
            secondVal=shiftResult[(column*4)+y];
            if (firstVal==1){
                mulResult = (firstVal * (hexToInt(secondVal[0])*16+hexToInt(secondVal[1])));
            } else if (firstVal==2){
                let res = mixColumnsTwo(secondVal);
                mulResult = (hexToInt(res[0])*16 + hexToInt(res[1]));
            } else {
                let res = mixColumnsThree(secondVal);
                mulResult = (hexToInt(res[0])*16 + hexToInt(res[1]));
            }
            xorVal=xorVal^mulResult;
        }
        colMixRes.push(intToHex(xorVal));
    }

    nextInput = colMixRes;

    return colMixRes;
}

function encryptionKeyExpansion(){

    let prevKey = nextKey;
    let newCol=nextKey.slice(13);
	newCol.push(nextKey[12]);
	let newCol2 = nextKey.slice(4,8);
	let newCol3 = nextKey.slice(8,12);
	let newCol4 = nextKey.slice(12,16);

    for (let r=0; r<4; r++){
        newCol[r]=Sbox[(16*hexToInt(newCol[r][0]))+hexToInt(newCol[r][1])];
    }
    newCol[0] = newCol[0]^(16*hexToInt((roundConstants[round][0]))+hexToInt(roundConstants[round][1]));
    let prevFirstCol = nextKey.slice(0,4);

    for (let q=0; q<4; q++){
        newCol[q]= ((16*hexToInt(prevFirstCol[q][0])+hexToInt(prevFirstCol[q][1]))^newCol[q]);
		newCol2[q]=(newCol[q]^(16*hexToInt(newCol2[q][0])+hexToInt(newCol2[q][1])));
		newCol3[q]=(newCol2[q]^(16*hexToInt(newCol3[q][0])+hexToInt(newCol3[q][1])));
		newCol4[q]=(newCol3[q]^(16*hexToInt(newCol4[q][0])+hexToInt(newCol4[q][1])));
    }

    for (let k=0; k<4; k++){
        newCol[k] = intToHex(newCol[k]);
		newCol2[k] = intToHex(newCol2[k]);
		newCol3[k] = intToHex(newCol3[k]) ;
		newCol4[k] = intToHex(newCol4[k]);
    }

    nextKey =  [...newCol, ...newCol2, ...newCol3, ...newCol4];

    return prevKey;

}

function keyExpansionPage(response, key){
    let newColumn = [key[13], key[14], key[15], key[12]];
    let subCol = [];
    let xorRound=[];
    let newXor=[];
    let newKey=[];
    for (let i=0;i<4;i++){
        calcVal = hexToInt(newColumn[i][0])*16+hexToInt(newColumn[i][1]);
        toXor = hexToInt(key[i][0])*16+hexToInt(key[i][1]);
        returnVal = Sbox[calcVal];
        if (i==0){
            xorRoundVal = returnVal^1;
        } else{
            xorRoundVal=returnVal;
        }
        newXorVal = xorRoundVal^toXor;
        subCol.push(intToHex(returnVal));
        xorRound.push(intToHex(xorRoundVal));
        newXor.push(intToHex(newXorVal));
    }
    newKey.push(newXor);
    for (let k=1; k<4; k++){
        nextCol=[];
        for (let z=0; z<4; z++){
            calcVal = hexToInt(newKey[k-1][z][0])*16+hexToInt(newKey[k-1][z][1]);
            toXor = hexToInt(key[(k*4)+z][0])*16+hexToInt(key[(k*4)+z][1]);
            nextCol.push(intToHex(calcVal^toXor));
        }
        newKey.push(nextCol);
    }
    response.render("keyexpansion", {in_values: key, secondCol:newColumn, substitution: subCol, xorVal: xorRound, newCol: newXor, finalans: newKey});
}

app.get("/", function(req, res){
    round = 0;
    eightBitKey=[];
    res.render("home");
})

app.get("/sbox", function(req, res){
    res.render("sbox");
})

app.post("/", function(req,res){
    res.render("input", {error_input:"", error_key:"", in_values: empty_string, key_values:empty_string});
})

app.post("/input", function(req,res){
    let input_str = _.toLower(req.body.inputStr);
    let input_key = _.toLower(req.body.key);
    let error_message="";
    let err_message="";
    eightBitInput = [];
    eightBitKey=[];

    for (let i=0; i<input_str.length; i++){
        if (!allowed_letters.includes(input_str[i]) || input_str.length>32){
            error_message = "Please enter a valid input.";
            break;
        } else{
            error_message="";
        }
    }

    for (let j=0; j<input_key.length;j++){
        if (!allowed_letters.includes(input_key[j]) || input_key.length>32){
            err_message = "Please enter a valid key.";
            break;
        } else{
            err_message="";
        }
    }
    if (err_message=="" && error_message==""){
        while(input_str.length<32){
            input_str+="0";
        }
        while(input_key.length<32){
            input_key+="0";
        }

        for (let z=0; z<32;z=z+2){
            let newStr = input_str[z]+input_str[z+1];
            eightBitInput.push(newStr);
            let newKey = input_key[z]+input_key[z+1];
            eightBitKey.push(newKey)
        }
        nextInput = eightBitInput;
        nextKey= eightBitKey;

        keyReset = eightBitKey;
        inputReset = eightBitInput;
        res.render("input", {error_input:error_message, error_key: err_message, in_values:eightBitInput, key_values:eightBitKey});
    } else{
        res.render("input", {error_input:error_message, error_key: err_message, in_values:empty_string, key_values:empty_string});
    }
    
})

app.post("/roundkey", function(req,res){
    if (round!=10){
        res.render("roundkey", {in_values:nextInput, key_values:nextKey, xor_result: empty_string, next_op: "Move to SubBytes Step"});
    } else{
        res.render("roundkey", {in_values:nextInput, key_values:nextKey, xor_result: empty_string, next_op: "Show Result"});
    }
    
})

app.post("/roundkeyaddition", function(req,res){

    var resArray=roundKeyXor();
    if (round!=10){
        res.render("roundkey", {in_values:nextInput, key_values:nextKey, xor_result: resArray, next_op: "Move to SubBytes Step"});
    } else{
        res.render("roundkey", {in_values:nextInput, key_values:nextKey, xor_result: resArray, next_op: "Show Result"});
    }
   
})

app.post("/subbytes", function(req,res){
    round++;
    res.render("rowcolsub", {
        heading: "Substituting Bytes - Round "+round,
        description_text: "The next step is substituting the bytes that were obtained from the previous step. This is done according to AES's predefined <a href=\"/sbox\">S-box</a>.",
        in_values: resArray,
        operation : "Substitution",
        res_values: empty_string,
        nextOp : "Shift Rows",
        flag:0
    });
})

app.post("/Substitution", function(req, res){
    
    var subResult=substitutionPage(resArray);

    res.render("rowcolsub", {
        heading: "Substituting Bytes - Round "+round,
        description_text: "The next step is substituting the bytes that were obtained from the previous step. This is done according to AES's predefined <a href=\"/sbox\">S-box</a>.",
        in_values: resArray,
        operation : "Substitution",
        res_values: subResult,
        nextOp: "Shift Rows",
        flag:0
    });
})

app.post("/Shift%20Rows", function(req, res){
    if (round!=10){
        res.render("rowcolsub", {
            heading: "Shifting Rows - Round "+round,
            description_text: "For the input that was obtained from the previous step, rows are shifted. The second row by one, the third row by two and the fourth row by three.",
            in_values: subResult,
            operation: "ShiftRows",
            res_values: empty_string,
            nextOp: "Mix Columns",
            flag:0
        });
    } else{
        res.render("rowcolsub", {
            heading: "Shifting Rows - Round "+round,
            description_text: "For the input that was obtained from the previous step, rows are shifted. The second row by one, the third row by two and the fourth row by three.",
            in_values: subResult,
            operation: "ShiftRows",
            res_values: empty_string,
            nextOp: "Key Expansion",
            flag:0
        });
    }
    
})

app.post("/ShiftRows", function(req, res){
    
    var shiftResult = shiftRowsPage(subResult);

    if (round!=10){
        res.render("rowcolsub", {
            heading: "Shifting Rows - Round "+round,
            description_text: "For the input that was obtained from the previous step, rows are shifted. The second row by one, the third row by two and the fourth row by three.",
            in_values: subResult,
            operation: "ShiftRows",
            res_values: shiftResult,
            nextOp: "Mix Columns",
            flag:1
        });
    }
    else{

        nextInput = shiftResult;

        res.render("rowcolsub", {
            heading: "Shifting Rows - Round "+round,
            description_text: "For the input that was obtained from the previous step, rows are shifted. The second row by one, the third row by two and the fourth row by three.",
            in_values: subResult,
            operation: "ShiftRows",
            res_values: shiftResult,
            nextOp: "Key Expansion",
            flag:1
        });
    }
    
})

app.post("/Mix%20Columns", function(req,res){
    res.render("rowcolsub", {
        heading: "Mixing Columns - Round "+round,
        description_text: "For the input that was obtained from the previous step, columns are mixed to increase diffusion.",
        in_values: shiftResult,
        operation: "MixColumns",
        res_values: empty_string,
        nextOp: "Key Expansion",
        flag:0
    });
})

app.post("/MixColumns", function(req, res){
    
    var colMixRes=mixColumnPage(shiftResult);

    res.render("rowcolsub", {
        heading: "Mixing Columns - Round "+round,
        description_text: "For the input that was obtained from the previous step, columns are mixed to increase diffusion.",
        in_values: shiftResult,
        operation: "MixColumns",
        res_values: colMixRes,
        nextOp: "Key Expansion",
        flag:0
    });

})

app.post("/Key%20Expansion", function(req, res){
    res.render("rowcolsub", {
        heading: "Key Expansion - Round "+round,
        description_text: "The round key to be added in a particular round is obtained from the key of the previous round. To see the complete process for first round, <a href=\"/viewKeyExpansion\">click here</a>.",
        in_values: nextKey,
        operation: "KeyExpansion",
        res_values: empty_string,
        nextOp : "AddRoundKey",
        flag:0
    })
})

app.post("/KeyExpansion", function(req, res){

    let prevKey = encryptionKeyExpansion();

    res.render("rowcolsub", {
        heading: "Key Expansion - Round "+round,
        description_text: "The round key to be added in a particular round is obtained from the key of the previous round. To see the complete process for first round, <a href=\"/viewKeyExpansion\">click here</a>.",
        in_values: prevKey,
        operation: "KeyExpansion",
        res_values: nextKey,
        nextOp : "AddRoundKey",
        flag:0
    })

})

app.post("/AddRoundKey", function(req, res){
    if (round!=10){
        res.render("roundkey", {in_values:nextInput, key_values:nextKey, xor_result: empty_string, next_op:"Move to SubBytes Step"});
    } else{
        res.render("roundkey", {in_values:nextInput, key_values:nextKey, xor_result: empty_string, next_op:"Show Result"});
    }
    
})

app.post("/result", function(req, res){
    res.render("rowcolsub", {
        heading: "The Final Encryption",
        description_text: "After 10 complete rounds of AES, the message's complete encryption is obtained.",
        in_values: eightBitInput,
        operation:"Encryption",
        res_values: resArray,
        nextOp:"",
        flag:0
    })
})

app.get("/keyExpansion", function(req, res){
    if (eightBitKey.length==0){
        res.render("keyinput", {
            in_values: empty_string,
            error_key:empty_string
        });
    } else {
        res.redirect("/viewKeyExpansion");
    }
})

app.post("/keyexpansioninput", function(req, res){
    let input_key = _.toLower(req.body.key);
    let error_message="";
    eightBitKey=[];

    for (let j=0; j<input_key.length;j++){
        if (!allowed_letters.includes(input_key[j]) || input_key.length>32){
            error_message = "Please enter a valid key.";
            break;
        } else{
            error_message="";
        }
    }
    if (error_message==""){
        while(input_key.length<32){
            input_key+="0";
        }

        for (let z=0; z<32;z=z+2){
            let newKey = input_key[z]+input_key[z+1];
            eightBitKey.push(newKey)
        }
        res.render("keyinput", {error_key: error_message, in_values:eightBitKey});
    } else{
        res.render("keyinput", { error_key: error_message, in_values:empty_string});
    }
    
})

app.get("/viewKeyExpansion", function(req, res){
    keyExpansionPage(res, eightBitKey);
})

app.post("/viewKeyExpansion", function(req, res){
    keyExpansionPage(res, eightBitKey);
})

app.post("/completeEncryption", function(req, res){
    round=0;
    roundKeyXor();
    for (let y=0; y<9; y++){
        round++;
        var subResult=substitutionPage(resArray);
        var shiftResult = shiftRowsPage(subResult);
        var colMixRes=mixColumnPage(shiftResult);
        let prevKey = encryptionKeyExpansion();
        roundKeyXor();
    }
    round++;
    var subResult=substitutionPage(resArray);
    nextInput = shiftRowsPage(subResult);
    let prevKey = encryptionKeyExpansion();
    roundKeyXor();

    var sendInput = eightBitInput;
    var sendResult = resArray;
    round=0;
    nextInput = inputReset;
    nextKey = keyReset;
    resArray=[];

    res.render("rowcolsub", {
        heading: "The Final Encryption",
        description_text: "After 10 complete rounds of AES, the message's complete encryption is obtained.",
        in_values: sendInput,
        operation:"Encryption",
        res_values: sendResult,
        nextOp:"",
        flag:0
    })
})

app.listen(process.env.PORT||3000, function(){
    console.log("Server is running on port 3000.")
})