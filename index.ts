enum BankCode {
	BCP = "002",
	BBVA = "011",
}

export enum BCPAccountTypes {
	Savings = "1",
	Checking = "2",
	CTS = "3",
}

export function convertBCPAccountNumberToCCI(
	accountNumber: string,
	accountType: BCPAccountTypes,
): string | null {
	if (!/^\d{14}$/.test(accountNumber)) return null;

	const accountSegment1 = accountNumber.slice(0, 3);
	const accountSegment2 = accountNumber.slice(3).padStart(11, "0");

	const cciSegment1 = BankCode.BCP + accountSegment1;
	const cciSegment2 = accountType + accountSegment2;

	function calculateCheckDigit(group: string): number {
		const sum = group.split("").reduce((acc, char, index) => {
			const num = Number(char);
			const product = num * (index % 2 === 0 ? 1 : 2);
			return (
				acc +
				product
					.toString()
					.split("")
					.reduce((a, d) => a + Number(d), 0)
			);
		}, 0);
		return (10 - (sum % 10)) % 10;
	}

	const checkDigit1 = calculateCheckDigit(cciSegment1);
	const checkDigit2 = calculateCheckDigit(cciSegment2);

	return `${cciSegment1}${cciSegment2}${checkDigit1}${checkDigit2}`;
}

function calculateFirstBBVACheckDigit(bank: string, branch: string): string {
	const input = bank + branch;
	const weights = [0, 1, 2, 1, 0, 2, 1, 2];
	let sum = 0;

	for (let i = 0; i < input.length; i++) {
		const digit = Number.parseInt(input.charAt(i), 10);
		let product = digit * weights[i];
		if (product >= 10) {
			product = Math.floor(product / 10) + (product % 10);
		}
		sum += product;
	}
	return ((10 - (sum % 10)) % 10).toString();
}

function calculateSecondBBVACheckDigit(
	control: string,
	account: string,
): string {
	const input = control + account;
	const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
	let sum = 0;

	for (let i = 0; i < input.length; i++) {
		const digit = Number.parseInt(input.charAt(i), 10);
		let product = digit * weights[i];
		if (product >= 10) {
			product = Math.floor(product / 10) + (product % 10);
		}
		sum += product;
	}
	return ((10 - (sum % 10)) % 10).toString();
}

export function convertBBVAAccountNumberToCCI(
	accountNumber: string,
): string | null {
	if (!/^\d{18}$/.test(accountNumber) && !/^\d{20}$/.test(accountNumber)) {
		return null;
	}

	const bank = accountNumber.slice(0, 4);
	const branch = accountNumber.slice(4, 8);

	let control: string;
	let account: string;

	if (accountNumber.length === 18) {
		control = accountNumber.slice(8, 10);
		account = accountNumber.slice(10);
	} else {
		const accountData = accountNumber.slice(10);
		control = accountData.slice(0, 2);
		account = accountData.slice(2);
	}

	const firstCheck = calculateFirstBBVACheckDigit(bank, branch);
	const secondCheck = calculateSecondBBVACheckDigit(control, account);

	return `${bank.substring(1)}${branch.substring(1)}00${control}${account}${firstCheck}${secondCheck}`;
}

const BANKS_CCI = [
	{
		name: "BCP",
		id: BankCode.BCP,
	},
	{
		name: "INTERBANK",
		id: "003",
	},
	{
		name: "SCOTIABANK",
		id: "009",
	},
	{
		name: "BBVA",
		id: BankCode.BBVA,
	},
	{
		name: "BANCO DE LA NACION",
		id: "018",
	},
	{
		name: "BANBIF",
		id: "038",
	},
	{
		name: "MI BANCO",
		id: "049",
	},
];

const getBankFromCCI = (cci: string): string => {
	if (!cci.match(/^[0-9]{20}$/)) {
		throw new Error("CCI must be numeric and have exactly 20 digits");
	}

	const bankIdentifier = cci.substring(0, 3);
	const bank = BANKS_CCI.find((item) => item.id === bankIdentifier);
	if (!bank) throw new Error("unknown bank identifier");

	return bank.name;
};

export type CCIMetadata =
	| {
			bank: "BCP";
			accountNumber: string;
			cci: string;
			currency: "USD" | "PEN";
			type: "Ahorro" | "Corriente";
	  }
	| {
			bank:
				| "INTERBANK"
				| "BBVA"
				| "SCOTIABANK"
				| "BANBIF"
				| "MI BANCO"
				| "BANCO DE LA NACION";
			accountNumber: string;
			cci: string;
	  };

export function getCCIMetadata(cci: string): CCIMetadata {
	const bank = getBankFromCCI(cci);
	switch (bank) {
		case "BCP": {
			const accountTypeDigit = cci.substring(6, 7);

			if (accountTypeDigit === "1") {
				return {
					bank,
					accountNumber: cci.substring(3, 6) + cci.substring(7, 18),
					cci,
					currency: cci.substring(15, 16) === "0" ? "PEN" : "USD",
					type: "Ahorro",
				};
			}

			return {
				bank,
				accountNumber: cci.substring(3, 6) + cci.substring(8, 18),
				cci,
				currency: cci.substring(15, 16) === "0" ? "PEN" : "USD",
				type: "Corriente",
			};
		}
		case "INTERBANK":
			return {
				bank,
				accountNumber: cci.substring(3, 6) + cci.substring(8, 18),
				cci,
			};
		case "BBVA":
			return {
				bank,
				accountNumber: `00110${cci.substring(3, 6)}${cci.substring(8, 18)}`,
				cci,
			};
		case "SCOTIABANK":
			return {
				bank,
				accountNumber: cci.substring(3, 6) + cci.substring(11, 18),
				cci,
			};
		case "BANBIF":
			return {
				bank,
				accountNumber: `0${cci.substring(7, 18)}`,
				cci,
			};
		case "MI BANCO":
			return {
				bank,
				accountNumber: cci.substring(8, 18),
				cci,
			};
		case "BANCO DE LA NACION":
			return {
				bank,
				accountNumber: cci.substring(7, 18),
				cci,
			};
		default:
			throw new Error("unknown bank identifier");
	}
}
