import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	INodePropertyOptions,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

const ASPECT_RATIO_OPTIONS: INodePropertyOptions[] = [
	{
		name: '1:1 (Square)',
		value: '1:1',
	},
];

const RESOLUTION_OPTIONS: INodePropertyOptions[] = [
	{
		name: '720p',
		value: '720p',
	},
];

export class KieSeedance implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Seedance',
		name: 'kieSeedance',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate videos from text or images using ByteDance Seedance 1.5 Pro',
		defaults: {
			name: 'Kie Seedance',
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
				placeholder: 'A serene landscape with flowing water',
				description: 'Text description for video generation',
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
				description: 'Optional comma-separated list of image URLs (0-2 images). Leave empty for text-to-video, provide images for image-to-video animation.',
			},
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'number',
				default: 8,
				typeOptions: {
					minValue: 1,
					maxValue: 30,
				},
				description: 'Video duration in seconds',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: ASPECT_RATIO_OPTIONS,
				default: '1:1',
				description: 'Output video aspect ratio',
			},
			{
				displayName: 'Resolution',
				name: 'resolution',
				type: 'options',
				options: RESOLUTION_OPTIONS,
				default: '720p',
				description: 'Output video resolution',
			},
			{
				displayName: 'Fixed Lens',
				name: 'fixedLens',
				type: 'boolean',
				default: false,
				description: 'Whether to use stable camera positioning without movements',
			},
			{
				displayName: 'Generate Audio',
				name: 'generateAudio',
				type: 'boolean',
				default: false,
				description: 'Whether to generate optional soundtrack (increases generation cost)',
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
				const duration = this.getNodeParameter('duration', i) as number;
				const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
				const resolution = this.getNodeParameter('resolution', i) as string;
				const fixedLens = this.getNodeParameter('fixedLens', i) as boolean;
				const generateAudio = this.getNodeParameter('generateAudio', i) as boolean;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				// Parse input images if provided (0-2 images)
				const inputUrls = inputUrlsString
					? inputUrlsString.split(',').map(url => url.trim()).filter(url => url)
					: [];

				if (inputUrls.length > 2) {
					throw new Error('Seedance supports a maximum of 2 input images');
				}

				const inputData: any = {
					prompt,
					aspect_ratio: aspectRatio,
					resolution,
					duration: duration.toString(),
					fixed_lens: fixedLens,
					generate_audio: generateAudio,
				};

				// Only include input_urls if images are provided
				if (inputUrls.length > 0) {
					inputData.input_urls = inputUrls;
				}

				const body: any = {
					model: 'bytedance/seedance-1.5-pro',
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
