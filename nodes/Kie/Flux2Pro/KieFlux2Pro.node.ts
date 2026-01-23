import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	INodePropertyOptions,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

// Flux2 Pro specific options
const FLUX2_ASPECT_RATIO_OPTIONS: INodePropertyOptions[] = [
	{
		name: '1:1 (Square)',
		value: '1:1',
	},
	{
		name: '4:3',
		value: '4:3',
	},
	{
		name: '3:4',
		value: '3:4',
	},
	{
		name: '16:9 (Landscape)',
		value: '16:9',
	},
	{
		name: '9:16 (Portrait)',
		value: '9:16',
	},
	{
		name: '3:2',
		value: '3:2',
	},
	{
		name: '2:3',
		value: '2:3',
	},
	{
		name: 'Auto (Match Input)',
		value: 'auto',
	},
];

const FLUX2_RESOLUTION_OPTIONS: INodePropertyOptions[] = [
	{
		name: '1K',
		value: '1K',
	},
	{
		name: '2K',
		value: '2K',
	},
];

export class KieFlux2Pro implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Flux-2 Pro',
		name: 'kieFlux2Pro',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate or transform images using Flux-2 Pro models',
		defaults: {
			name: 'Kie Flux-2 Pro',
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
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				default: '',
				typeOptions: {
					rows: 4,
				},
				placeholder: 'A beautiful sunset over mountains',
				description: 'Text description for image generation (3-5000 characters)',
			},
			{
				displayName: 'Input Images',
				name: 'inputUrls',
				type: 'string',
				required: false,
				default: '',
				typeOptions: {
					rows: 2,
				},
				placeholder: 'https://example.com/image1.jpg, https://example.com/image2.jpg',
				description: 'Optional comma-separated list of input image URLs (1-8 images). Leave empty for text-to-image generation.',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: FLUX2_ASPECT_RATIO_OPTIONS,
				default: '1:1',
				description: 'Output image aspect ratio. "Auto" matches first input image ratio (image-to-image only).',
			},
			{
				displayName: 'Resolution',
				name: 'resolution',
				type: 'options',
				options: FLUX2_RESOLUTION_OPTIONS,
				default: '1K',
				description: 'Output image resolution/quality',
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
				const prompt = this.getNodeParameter('prompt', i) as string;
				const inputUrlsString = this.getNodeParameter('inputUrls', i, '') as string;
				const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
				const resolution = this.getNodeParameter('resolution', i) as string;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				// Parse input URLs if provided
				const inputUrls = inputUrlsString
					? inputUrlsString.split(',').map(url => url.trim()).filter(url => url)
					: [];

				// Choose model based on whether images are provided
				const model = inputUrls.length > 0
					? 'flux-2/pro-image-to-image'
					: 'flux-2/pro-text-to-image';

				const body: any = {
					model,
					input: {
						prompt,
						aspect_ratio: aspectRatio,
						resolution,
					},
				};

				// Only include input_urls for image-to-image model
				if (inputUrls.length > 0) {
					body.input.input_urls = inputUrls;
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
