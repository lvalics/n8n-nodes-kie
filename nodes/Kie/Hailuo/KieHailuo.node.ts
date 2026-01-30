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
		description: 'Generate video from image and text prompt',
	},
];

export class KieHailuo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Hailuo',
		name: 'kieHailuo',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate videos using Hailuo 02 Pro models',
		defaults: {
			name: 'Kie Hailuo',
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
				placeholder: 'Cinematic wide shot: A colossal starship drifts silently above the rings of Saturn...',
				description: 'Detailed text description for video generation. Supports complex cinematic descriptions with camera movements, environments, and visual effects.',
			},
			{
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['imageToVideo'],
					},
				},
				default: '',
				placeholder: 'https://example.com/image.jpg',
				description: 'Source image URL for video generation',
			},
			{
				displayName: 'Prompt Optimizer',
				name: 'promptOptimizer',
				type: 'boolean',
				default: true,
				description: 'Whether to automatically enhance and refine the prompt before processing',
			},
			{
				displayName: 'End Image URL',
				name: 'endImageUrl',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['imageToVideo'],
					},
				},
				default: '',
				placeholder: 'https://example.com/end-frame.jpg',
				description: 'Optional ending frame for the video',
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
				const operation = this.getNodeParameter('operation', i) as string;
				const prompt = this.getNodeParameter('prompt', i) as string;
				const promptOptimizer = this.getNodeParameter('promptOptimizer', i) as boolean;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				let model: string;
				let inputData: any = {
					prompt,
					prompt_optimizer: promptOptimizer,
				};

				if (operation === 'textToVideo') {
					model = 'hailuo/02-text-to-video-pro';
				} else {
					// imageToVideo
					model = 'hailuo/02-image-to-video-pro';
					const imageUrl = this.getNodeParameter('imageUrl', i) as string;
					const endImageUrl = this.getNodeParameter('endImageUrl', i, '') as string;

					inputData.image_url = imageUrl;
					if (endImageUrl) {
						inputData.end_image_url = endImageUrl;
					}
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
