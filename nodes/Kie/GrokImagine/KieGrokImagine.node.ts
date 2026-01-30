import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	INodePropertyOptions,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

const OPERATION_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Text-to-Video',
		value: 'textToVideo',
		description: 'Generate video from text prompt only',
	},
	{
		name: 'Image-to-Video',
		value: 'imageToVideo',
		description: 'Transform images into video with text prompt',
	},
];

const ASPECT_RATIO_OPTIONS: INodePropertyOptions[] = [
	{
		name: '2:3 (Portrait)',
		value: '2:3',
	},
	{
		name: '3:2 (Landscape)',
		value: '3:2',
	},
	{
		name: '1:1 (Square)',
		value: '1:1',
	},
	{
		name: '16:9 (Wide Screen)',
		value: '16:9',
	},
	{
		name: '9:16 (Tall Screen)',
		value: '9:16',
	},
];

const MODE_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Normal',
		value: 'normal',
		description: 'Balanced approach with quality motion',
	},
	{
		name: 'Fun',
		value: 'fun',
		description: 'Creative and playful interpretation',
	},
	{
		name: 'Spicy',
		value: 'spicy',
		description: 'Dynamic and intense motion effects',
	},
];

export class KieGrokImagine implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Grok Imagine',
		name: 'kieGrokImagine',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate videos using Grok Imagine AI',
		defaults: {
			name: 'Kie Grok Imagine',
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: OPERATION_OPTIONS,
				default: 'textToVideo',
				description: 'Choose the video generation mode',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				default: '',
				typeOptions: {
					rows: 4,
				},
				placeholder: 'A camera slowly pans across a serene mountain landscape at sunset...',
				description: 'Text description of desired video motion (max 5000 characters, English). Include movement, action sequences, camera work, and timing.',
			},
			{
				displayName: 'Image URLs',
				name: 'imageUrls',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['imageToVideo'],
					},
				},
				default: '',
				typeOptions: {
					rows: 2,
				},
				placeholder: 'https://example.com/image1.jpg, https://example.com/image2.jpg',
				description: 'Comma-separated list of image URLs to transform into video',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: MODE_OPTIONS,
				default: 'normal',
				description: 'Video generation style and motion intensity',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: ASPECT_RATIO_OPTIONS,
				displayOptions: {
					show: {
						operation: ['textToVideo'],
					},
				},
				default: '2:3',
				description: 'Output video aspect ratio (text-to-video only)',
			},
			{
				displayName: 'Callback URL',
				name: 'callBackUrl',
				type: 'string',
				default: '',
				placeholder: 'https://your-webhook.com/callback',
				description: 'Optional webhook URL to receive completion notification. Note: Generated video URLs are valid for 24 hours.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const prompt = this.getNodeParameter('prompt', i) as string;
				const mode = this.getNodeParameter('mode', i) as string;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				let model: string;
				let inputData: any = {
					prompt,
					mode,
				};

				if (operation === 'textToVideo') {
					model = 'grok-imagine/text-to-video';
					const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
					inputData.aspect_ratio = aspectRatio;
				} else {
					// imageToVideo
					model = 'grok-imagine/image-to-video';
					const imageUrlsString = this.getNodeParameter('imageUrls', i) as string;
					const imageUrls = imageUrlsString
						.split(',')
						.map(url => url.trim())
						.filter(url => url);

					if (imageUrls.length === 0) {
						throw new Error('At least one image URL is required for image-to-video');
					}

					inputData.image_urls = imageUrls;
				}

				const body: any = {
					model,
					input: inputData,
				};

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
