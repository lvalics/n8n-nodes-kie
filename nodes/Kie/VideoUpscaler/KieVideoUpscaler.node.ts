import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	INodePropertyOptions,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

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
];

export class KieVideoUpscaler implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Video Upscaler',
		name: 'kieVideoUpscaler',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Upscale videos using Topaz AI video enhancement',
		defaults: {
			name: 'Kie Video Upscaler',
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
				displayName: 'Video URL',
				name: 'videoUrl',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://example.com/video.mp4',
				description: 'URL of the video to upscale (MP4, QuickTime, or Matroska format, max 10MB)',
			},
			{
				displayName: 'Upscale Factor',
				name: 'upscaleFactor',
				type: 'options',
				options: UPSCALE_FACTOR_OPTIONS,
				default: '2',
				description: 'Factor to upscale the video by (e.g., 2x doubles width and height)',
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
				const upscaleFactor = this.getNodeParameter('upscaleFactor', i) as string;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				const body: any = {
					model: 'topaz/video-upscale',
					input: {
						video_url: videoUrl,
						upscale_factor: upscaleFactor,
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
