import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, createTransferCheckedInstruction, getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const PROGRAM_ID = new PublicKey(required("POWERPAY_PROGRAM_ID"));
const RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(RPC, "confirmed");
const authority = loadKeypair(process.env.ANCHOR_WALLET || "~/.config/solana/id.json");
const [config] = PublicKey.findProgramAddressSync([Buffer.from("sale")], PROGRAM_ID);

function required(name) { const v = process.env[name]; if (!v) throw new Error(`${name} is required`); return v; }
function expand(file) { return file.startsWith("~/") ? path.join(os.homedir(), file.slice(2)) : file; }
function loadKeypair(file) { const bytes = JSON.parse(fs.readFileSync(expand(file), "utf8")); return Keypair.fromSecretKey(Uint8Array.from(bytes)); }
function discriminator(name) { return crypto.createHash("sha256").update(`global:${name}`).digest().subarray(0, 8); }
function u64(value) { const b=Buffer.alloc(8); b.writeBigUInt64LE(BigInt(value)); return b; }
function decimalToRaw(value, decimals) { const s=String(value).trim(); if(!/^\d+(?:\.\d+)?$/.test(s)) throw new Error(`Invalid decimal: ${value}`); const [w,f=""]=s.split("."); if(f.length>decimals && /[1-9]/.test(f.slice(decimals))) throw new Error(`Too many decimals: ${value}`); return BigInt(w)*(10n**BigInt(decimals))+BigInt((f.slice(0,decimals)+"0".repeat(decimals)).slice(0,decimals)||"0"); }
function solToLamports(value) { return decimalToRaw(value, 9); }
async function send(ixs) { const tx=new Transaction().add(...ixs); tx.feePayer=authority.publicKey; const sig=await sendAndConfirmTransaction(connection,tx,[authority],{commitment:"confirmed"}); console.log(`Signature: ${sig}`); return sig; }

async function initialize() {
  const mint=new PublicKey(required("PWRC_MINT")); const treasury=new PublicKey(required("POWERPAY_TREASURY"));
  const rate=BigInt(process.env.PWRC_PER_SOL || "73500000"); const min=solToLamports(process.env.PWRC_MIN_SOL || "0.01"); const max=solToLamports(process.env.PWRC_MAX_SOL || "100");
  const vault=getAssociatedTokenAddressSync(mint,config,true,TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
  const data=Buffer.concat([discriminator("initialize_sale"),u64(rate),u64(min),u64(max)]);
  const ix=new TransactionInstruction({programId:PROGRAM_ID,data,keys:[
    {pubkey:authority.publicKey,isSigner:true,isWritable:true}, {pubkey:treasury,isSigner:false,isWritable:false}, {pubkey:mint,isSigner:false,isWritable:false},
    {pubkey:config,isSigner:false,isWritable:true}, {pubkey:vault,isSigner:false,isWritable:true}, {pubkey:TOKEN_2022_PROGRAM_ID,isSigner:false,isWritable:false},
    {pubkey:ASSOCIATED_TOKEN_PROGRAM_ID,isSigner:false,isWritable:false}, {pubkey:SystemProgram.programId,isSigner:false,isWritable:false},
  ]});
  await send([ix]); console.log(`Sale config: ${config}`); console.log(`Sale vault: ${vault}`); console.log("Initialized disabled. Fund inventory, then run pnpm sale:update with PWRC_SALE_ENABLED=true.");
}

async function update() {
  const rate=BigInt(process.env.PWRC_PER_SOL || "73500000"); const min=solToLamports(process.env.PWRC_MIN_SOL || "0.01"); const max=solToLamports(process.env.PWRC_MAX_SOL || "100"); const enabled=String(process.env.PWRC_SALE_ENABLED).toLowerCase()==="true";
  const data=Buffer.concat([discriminator("update_sale"),u64(rate),u64(min),u64(max),Buffer.from([enabled?1:0])]);
  const ix=new TransactionInstruction({programId:PROGRAM_ID,data,keys:[{pubkey:authority.publicKey,isSigner:true,isWritable:false},{pubkey:config,isSigner:false,isWritable:true}]});
  await send([ix]); console.log(`Updated sale. enabled=${enabled}`);
}

async function fund() {
  const mint=new PublicKey(required("PWRC_MINT")); const raw=decimalToRaw(required("PWRC_FUND_AMOUNT"),9); const source=getAssociatedTokenAddressSync(mint,authority.publicKey,false,TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID); const vault=getAssociatedTokenAddressSync(mint,config,true,TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
  const sourceInfo=await connection.getAccountInfo(source); if(!sourceInfo) throw new Error(`Authority PWRC ATA does not exist: ${source}`); const vaultInfo=await connection.getAccountInfo(vault); if(!vaultInfo) throw new Error(`Sale vault does not exist: ${vault}. Run sale:init first.`);
  await send([createTransferCheckedInstruction(source,mint,vault,authority.publicKey,raw,9,[],TOKEN_2022_PROGRAM_ID)]); console.log(`Funded gross ${process.env.PWRC_FUND_AMOUNT} PWRC. Token-2022 transfer fee, if configured, applies to this inventory transfer.`);
}

async function inspect() {
  const info=await connection.getAccountInfo(config,"confirmed"); if(!info){console.log("Sale config not initialized",config.toBase58());return;} let o=8; const pk=()=>{const v=new PublicKey(info.data.subarray(o,o+32));o+=32;return v.toBase58()}; const n=()=>{const v=info.data.readBigUInt64LE(o);o+=8;return v};
  const state={config:config.toBase58(),authority:pk(),treasury:pk(),pwrcMint:pk(),pwrcPerSolGross:n().toString(),minLamports:n().toString(),maxLamports:n().toString(),enabled:info.data[o++]===1,bump:info.data[o]}; console.log(JSON.stringify(state,null,2));
}

const command=process.argv[2];
if(command==="initialize") await initialize(); else if(command==="update") await update(); else if(command==="fund") await fund(); else if(command==="inspect") await inspect(); else throw new Error("Usage: sale-admin.mjs initialize|update|fund|inspect");
