import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

export class KieSoraWatermarkRemover implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Sora Watermark Remover',
		name: 'kieSoraWatermarkRemover',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Remove watermarks from Sora 2 generated videos',
		defaults: {
			name: 'Kie Sora Watermark Remover',
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
				displayName: 'Important Notice',
				name: 'importantNotice',
				type: 'notice',
				default: '',
				description: '⚠️ IMPORTANT: This service only works with Sora 2 video URLs from OpenAI (must start with sora.chatgpt.com). Videos are stored for 14 days only.',
			},
			{
				displayName: 'Video URL',
				name: 'videoUrl',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://sora.chatgpt.com/...',
				description: 'Sora 2 video URL from OpenAI (must be publicly accessible and start with sora.chatgpt.com)',
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
				const videoUrl = this.getNodeParameter('videoUrl', i) as string;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				// Validate that the URL is from sora.chatgpt.com
				if (!videoUrl.startsWith('https://sora.chatgpt.com/')) {
					throw new Error(
						'Video URL must be from OpenAI Sora 2 (must start with https://sora.chatgpt.com/)',
					);
				}

				const body: any = {
					model: 'sora-watermark-remover',
					input: {
						video_url: videoUrl,
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
