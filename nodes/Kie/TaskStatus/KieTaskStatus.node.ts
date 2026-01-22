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
		icon: 'file:../kie.png',
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
					`/api/v1/jobs/${taskId}`,
					{},
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
