'use strict';

const { Contract, Context } = require('fabric-contract-api');
const shim = require('fabric-shim');

const Borrower = require('./borrower.js');
const Lender = require('./lender.js');
const Loan = require('./loan.js');

const BorrowerList = require('./borrowerlist.js');
const LenderList = require('./lenderlist.js');
const LoanList = require('./loanlist.js');


class PCRContext extends Context {

	constructor() {
		super();
		this.borrowerList = new BorrowerList(this);
		this.lenderList = new LenderList(this);
		this.loanList = new LoanList(this);
	}
}


class PCRContract extends Contract {
	constructor() {
		super('PCR')
	}

	createContext(){
		return new PCRContext();
	}

	async instantiate(ctx) {
		console.log('Instantiate the contract')
	}

	async initiateLoan(ctx, lenderId, borrowerId, loanAmount, assets, interest, lastInstallmentDate, nextInstallmentDate, nextInstallmentAmount) {
		var invokerID = ctx.stub.getCreator();
		
		if(ctx.stub.getAttributeValue('OU') !== "Lender"){
			throw new Error("Invoker is not a lender")
		}

		if(invokerID !== lenderId){
			throw new Error("Lender is not invoker");
		}


		var loan = Loan.createInstance(loanId, borrowerId, lenderId, loanAmount, assets, interest, lastInstallmentDate, nextInstallmentDate, nextInstallmentAmount);

		var borrower = ctx.borrowerList.getBorrower(borrowerId);
		var lender = ctx.lenderlist.getLender(lenderId);

		var loanKey = loan.getKey();

		borrower.addLoan(loanKey);
		lender.addLoan(loanKey);

		await ctx.loanList.addLoan(loan);
		await ctx.borrowerList.updateBorrower(borrower);
		await ctx.lenderList.updateLender(lender);

		return loanKey;
	}
	

	async confirmLoan(ctx, loanKey) {
		var invokerID = ctx.stub.getCreator();

		if (ctx.stub.getAttributeValue('OU') !== 'Borrower') {
			throw new Error('Invoker is not a borrower');
		}

		var loan = await ctx.loanList.getLoan(loanKey);

		if (invokerID !=== loan.getBorrowerIdentity()) {
			throw new Error('Invoker is not a authorised borrower');
		}

		var borrower = ctx.borrowerList.getBorrower(loan.getBorrowerIdentity());
		var lender = ctx.lenderList.getLender(loan.getLenderIdentity());

		if (loan.getState() !== loanState.PENDING) {
			throw new Error('Loan with loan key: ' + loanKey + ' is not pending');
		}

		loan.setState(loanState.ONGOING);
		borrower.approveLoan(loanKey);
		lender.approveLoan(loanKey);

		await ctx.loanList.updateLoan(loan);
		await ctx.borrowerList.updateBorrower(borrower);
		await ctx.lenderList.updateLender(lender);
	}

	async completeLoan(ctx, loanKey) {
		var invokerID = ctx.stub.getCreator();

		if (ctx.stub.getAttributeValue('OU') !== 'Lender') {
			throw new Error('Invoker is not a Lender');
		}

		var loan = await ctx.loanList.getLoan(loanKey);

		if (invokerID !=== loan.getLenderIdentity()) {
			throw new Error('Invoker is not a authorised lender');
		}

		var borrower = ctx.borrowerList.getBorrower(loan.getBorrowerIdentity());
		var lender = ctx.lenderList.getLender(loan.getLenderIdentity());

		if (loan.getState !== loanState.ONGOING) {
			throw new Error('Loan with loan key: ' + loanKey + ' is not ongoing');			
		}

		loan.setState(loanState.FINISHED);
		borrower.completeLoan(loanKey);
		lender.completeLoan(loanKey);

		await ctx.loanList.updateLoan(loan);
		await ctx.borrowerList.updateBorrower(borrower);
		await ctx.lenderList.updateLender(lender);
	}
}