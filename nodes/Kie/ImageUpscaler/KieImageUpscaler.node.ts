import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	INodePropertyOptions,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

const SERVICE_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Topaz',
		value: 'topaz',
		description: 'Topaz AI image upscaling with configurable factor (1x-8x)',
	},
	{
		name: 'Recraft Crisp',
		value: 'recraft',
		description: 'Recraft Crisp automatic upscaling',
	},
];

const UPSCALE_FACTOR_OPTIONS: INodePropertyOptions[] = [
	{
		name: '1x (Original Size)',
		value: '1',
	},
	{
		name: '2x (Double Size)',
		value: '2',
	},
	{
		name: '4x (Quadruple Size)',
		value: '4',
	},
	{
		name: '8x (Eight Times)',
		value: '8',
	},
];

export class KieImageUpscaler implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Image Upscaler',
		name: 'kieImageUpscaler',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Upscale images using Topaz or Recraft AI enhancement',
		defaults: {
			name: 'Kie Image Upscaler',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'kieApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Service',
				name: 'service',
				type: 'options',
				options: SERVICE_OPTIONS,
				default: 'topaz',
				description: 'Choose the upscaling service to use',
			},
			{
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://example.com/image.jpg',
				description: 'URL of the image to upscale (JPEG, PNG, or WebP, max 10MB)',
			},
			{
				displayName: 'Upscale Factor',
				name: 'upscaleFactor',
				type: 'options',
				options: UPSCALE_FACTOR_OPTIONS,
				displayOptions: {
					show: {
						service: ['topaz'],
					},
				},
				default: '2',
				description: 'Factor to upscale the image by (Topaz only)',
			},
			{
				displayName: 'Callback URL',
				name: 'callBackUrl',
				type: 'string',
				default: '',
				placeholder: 'https://your-webhook.com/callback',
				description: 'Optional webhook URL to receive completion notification',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const service = this.getNodeParameter('service', i) as string;
				const imageUrl = this.getNodeParameter('imageUrl', i) as string;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				let body: any;

				if (service === 'topaz') {
					const upscaleFactor = this.getNodeParameter('upscaleFactor', i) as string;
					body = {
						model: 'topaz/image-upscale',
						input: {
							image_url: imageUrl,
							upscale_factor: upscaleFactor,
						},
					};
				} else {
					// recraft
					body = {
						model: 'recraft/crisp-upscale',
						input: {
							image: imageUrl,
						},
					};
				}

				if (callBackUrl) {
					body.callBackUrl = callBackUrl;
				}

				const responseData = await kieApiRequest.call(
					this,
					'POST',
					'/api/v1/jobs/createTask',
					body,
				);

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
