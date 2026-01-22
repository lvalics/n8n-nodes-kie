import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

export class KieTaskStatus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Task Status',
		name: 'kieTaskStatus',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Get the status and results of a Kie.ai task',
		defaults: {
			name: 'Kie Task Status',
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
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'task_abc123...',
				description: 'The ID of the task to check',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const taskId = this.getNodeParameter('taskId', i) as string;

				const responseData = await kieApiRequest.call(
					this,
					'GET',
					'/api/v1/jobs/recordInfo',
					{},
					{ taskId },
				);

				// Parse and clean the response
				let cleanedData = responseData;

				if (responseData.data) {
					const data = responseData.data;
					const cleaned: any = {
						taskId: data.taskId,
						model: data.model,
						state: data.state,
						createTime: data.createTime,
						completeTime: data.completeTime,
						costTime: data.costTime,
					};

					// Parse param JSON string
					if (data.param && typeof data.param === 'string') {
						try {
							const parsedParam = JSON.parse(data.param);
							cleaned.parameters = parsedParam;

							// Further parse nested input if it exists
							if (parsedParam.input && typeof parsedParam.input === 'string') {
								try {
									cleaned.input = JSON.parse(parsedParam.input);
								} catch (e) {
									cleaned.input = parsedParam.input;
								}
							}
						} catch (e) {
							cleaned.parameters = data.param;
						}
					}

					// Parse resultJson string
					if (data.resultJson && typeof data.resultJson === 'string' && data.resultJson !== '') {
						try {
							cleaned.result = JSON.parse(data.resultJson);
						} catch (e) {
							cleaned.result = data.resultJson;
						}
					}

					// Include error information if present
					if (data.failCode !== null || data.failMsg !== null) {
						cleaned.error = {
							code: data.failCode,
							message: data.failMsg,
						};
					}

					cleanedData = {
						code: responseData.code,
						message: responseData.msg,
						data: cleaned,
					};
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(cleanedData),
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
