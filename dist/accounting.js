import {money} from './pricing.js';
export function account(){return {cash:10000,capital:10000,realized:0,positions:[],stocks:{},ledger:[],history:[10000],executed:[]}}
export const reserved=a=>money(a.positions.reduce((n,p)=>n+p.collateral,0));
export const buyingPower=a=>money(a.cash-reserved(a));
export const committed=(a,t)=>a.positions.filter(p=>p.strategy==='Covered call'&&p.ticker===t).reduce((n,p)=>n+p.qty*100,0);
export function metrics(a,mark,stockPrice){let value=0,unrealized=0,liquidation=a.cash;for(const p of a.positions){const m=mark(p,false),close=mark(p,true);value+=m;unrealized+=m-p.debit;liquidation+=close}for(const [t,s] of Object.entries(a.stocks)){value+=s.qty*stockPrice(t);unrealized+=s.qty*(stockPrice(t)-s.basis);liquidation+=s.qty*stockPrice(t)}return {equity:money(a.cash+value),unrealized:money(unrealized),liquidation:money(liquidation)}}
export function record(a,text,amount,id){a.ledger.unshift({id:id||crypto.randomUUID(),text,amount:money(amount),timestamp:new Date().toISOString()})}
export function fund(a,amount){if(!Number.isFinite(amount)||!amount||Math.abs(amount)>1e8||buyingPower(a)+amount<0)throw Error('Invalid funding or insufficient available cash');a.cash=money(a.cash+amount);a.capital=money(a.capital+amount);record(a,amount>0?'Deposit':'Withdrawal',amount)}
