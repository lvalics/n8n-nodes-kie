import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

/**
 * Make an authenticated API request to Kie.ai
 */
export async function kieApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: any = {},
	qs: any = {},
	option: any = {},
): Promise<any> {
	const credentials = await this.getCredentials('kieApi');

	const options = {
		method,
		body,
		qs,
		uri: `${credentials.domain}${endpoint}`,
		json: true,
		headers: {
			'Authorization': `Bearer ${credentials.apiKey}`,
			'Content-Type': 'application/json',
		},
		...option,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw error;
	}
}

/**
 * Make an authenticated API request to Kie.ai File Upload API
 * Note: File Upload API uses a different base URL
 */
export async function kieFileApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: any = {},
	qs: any = {},
	option: any = {},
): Promise<any> {
	const credentials = await this.getCredentials('kieApi');

	const options = {
		method,
		body,
		qs,
		uri: `https://kieai.redpandaai.co${endpoint}`,
		json: true,
		headers: {
			'Authorization': `Bearer ${credentials.apiKey}`,
			'Content-Type': 'application/json',
		},
		...option,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw error;
	}
}
