import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

export class KieSeedreamTextToImage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Seedream Text to Image',
		name: 'kieSeedreamTextToImage',
		icon: 'file:../kie.png',
		group: ['transform'],
		version: 1,
		description: 'Generate images from text prompts using Kie.ai Seedream',
		defaults: {
			name: 'Seedream Text to Image',
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
				description: 'Text description of the image to generate',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: [
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
						name: '2:3',
						value: '2:3',
					},
					{
						name: '3:2',
						value: '3:2',
					},
					{
						name: '21:9 (Ultrawide)',
						value: '21:9',
					},
				],
				default: '1:1',
				description: 'Aspect ratio for the generated image',
			},
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'options',
				options: [
					{
						name: 'Basic',
						value: 'basic',
					},
					{
						name: 'High',
						value: 'high',
					},
				],
				default: 'basic',
				description: 'Quality level of the generated image',
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
				const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
				const quality = this.getNodeParameter('quality', i) as string;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				const body: any = {
					model: 'seedream/4.5-text-to-image',
					input: {
						prompt,
						aspect_ratio: aspectRatio,
						quality,
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
