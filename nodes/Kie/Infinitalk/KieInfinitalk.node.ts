import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	INodePropertyOptions,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

const RESOLUTION_OPTIONS: INodePropertyOptions[] = [
	{
		name: '480p (SD)',
		value: '480p',
	},
	{
		name: '720p (HD)',
		value: '720p',
	},
	{
		name: '1080p (Full HD)',
		value: '1080p',
	},
];

export class KieInfinitalk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Infinitalk',
		name: 'kieInfinitalk',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate talking head videos from audio using Infinitalk',
		defaults: {
			name: 'Kie Infinitalk',
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
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://example.com/portrait.jpg',
				description: 'URL of the static image/portrait to animate',
			},
			{
				displayName: 'Audio URL',
				name: 'audioUrl',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://example.com/speech.mp3',
				description: 'URL of the audio file to drive the animation',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				default: '',
				typeOptions: {
					rows: 3,
				},
				placeholder: 'Natural speaking animation with subtle head movements',
				description: 'Text description of the desired animation style',
			},
			{
				displayName: 'Resolution',
				name: 'resolution',
				type: 'options',
				options: RESOLUTION_OPTIONS,
				default: '720p',
				description: 'Output video resolution/quality',
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
				const imageUrl = this.getNodeParameter('imageUrl', i) as string;
				const audioUrl = this.getNodeParameter('audioUrl', i) as string;
				const prompt = this.getNodeParameter('prompt', i) as string;
				const resolution = this.getNodeParameter('resolution', i) as string;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				const body: any = {
					model: 'infinitalk/from-audio',
					input: {
						image_url: imageUrl,
						audio_url: audioUrl,
						prompt,
						resolution,
					},
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
