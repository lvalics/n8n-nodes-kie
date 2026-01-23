import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	INodePropertyOptions,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

// Google Pro specific aspect ratio options
const GOOGLE_PRO_ASPECT_RATIO_OPTIONS: INodePropertyOptions[] = [
	{
		name: '1:1 (Square)',
		value: '1:1',
	},
	{
		name: '9:16 (Portrait)',
		value: '9:16',
	},
	{
		name: '16:9 (Landscape)',
		value: '16:9',
	},
	{
		name: '4:3',
		value: '4:3',
	},
	{
		name: '3:4',
		value: '3:4',
	},
];

const RESOLUTION_OPTIONS: INodePropertyOptions[] = [
	{
		name: '1K',
		value: '1K',
	},
	{
		name: '2K',
		value: '2K',
	},
	{
		name: '4K',
		value: '4K',
	},
];

const OUTPUT_FORMAT_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'PNG',
		value: 'png',
	},
	{
		name: 'JPEG',
		value: 'jpeg',
	},
	{
		name: 'WebP',
		value: 'webp',
	},
];

export class KieGoogleNanoBananaPro implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Google Nano Banana Pro',
		name: 'kieGoogleNanoBananaPro',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Image generation using Google\'s Nano Banana Pro Image-to-Image model',
		defaults: {
			name: 'Kie Google Nano Banana Pro',
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
				description: 'Text description for image generation or modification',
			},
			{
				displayName: 'Input Images',
				name: 'imageInput',
				type: 'string',
				required: false,
				default: '',
				typeOptions: {
					rows: 2,
				},
				placeholder: 'https://example.com/image1.jpg, https://example.com/image2.jpg',
				description: 'Optional comma-separated list of input image URLs to process. Leave empty for text-to-image generation.',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: GOOGLE_PRO_ASPECT_RATIO_OPTIONS,
				default: '1:1',
				description: 'Output image aspect ratio',
			},
			{
				displayName: 'Resolution',
				name: 'resolution',
				type: 'options',
				options: RESOLUTION_OPTIONS,
				default: '1K',
				description: 'Output image resolution/quality',
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				options: OUTPUT_FORMAT_OPTIONS,
				default: 'png',
				description: 'Image output format',
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
				const imageInputString = this.getNodeParameter('imageInput', i) as string;
				const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
				const resolution = this.getNodeParameter('resolution', i) as string;
				const outputFormat = this.getNodeParameter('outputFormat', i) as string;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				// Parse input images if provided
				const imageInput = imageInputString
					? imageInputString.split(',').map(url => url.trim()).filter(url => url)
					: [];

				const body: any = {
					model: 'nano-banana-pro',
					input: {
						prompt,
						aspect_ratio: aspectRatio,
						resolution,
						output_format: outputFormat,
					},
				};

				// Only include image_input if images are provided
				if (imageInput.length > 0) {
					body.input.image_input = imageInput;
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
