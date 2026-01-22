import { INodeProperties } from 'n8n-workflow';

export const seedreamOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['seedream'],
			},
		},
		options: [
			{
				name: 'Text to Image',
				value: 'textToImage',
				description: 'Generate an image from text prompt',
				action: 'Generate image from text',
			},
			{
				name: 'Edit Image',
				value: 'editImage',
				description: 'Edit an existing image using text prompt',
				action: 'Edit image',
			},
			{
				name: 'Get Task',
				value: 'getTask',
				description: 'Get the status and result of a task',
				action: 'Get task status',
			},
		],
		default: 'textToImage',
	},
];

export const seedreamFields: INodeProperties[] = [
	// Text to Image Fields
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['seedream'],
				operation: ['textToImage'],
			},
		},
		default: '',
		placeholder: 'A beautiful sunset over mountains',
		description: 'Description of the image to generate (max 3000 characters)',
		typeOptions: {
			rows: 4,
		},
	},
	{
		displayName: 'Aspect Ratio',
		name: 'aspectRatio',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['seedream'],
				operation: ['textToImage'],
			},
		},
		options: [
			{ name: '1:1 (Square)', value: '1:1' },
			{ name: '4:3 (Landscape)', value: '4:3' },
			{ name: '3:4 (Portrait)', value: '3:4' },
			{ name: '16:9 (Widescreen)', value: '16:9' },
			{ name: '9:16 (Vertical)', value: '9:16' },
			{ name: '2:3 (Portrait)', value: '2:3' },
			{ name: '3:2 (Landscape)', value: '3:2' },
			{ name: '21:9 (Ultra-wide)', value: '21:9' },
		],
		default: '1:1',
		description: 'Aspect ratio of the generated image',
	},
	{
		displayName: 'Quality',
		name: 'quality',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['seedream'],
				operation: ['textToImage'],
			},
		},
		options: [
			{ name: 'Basic (2K)', value: 'basic' },
			{ name: 'High (4K)', value: 'high' },
		],
		default: 'basic',
		description: 'Quality level of the generated image',
	},

	// Edit Image Fields
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['seedream'],
				operation: ['editImage'],
			},
		},
		default: '',
		placeholder: 'Change the sky to a starry night',
		description: 'Instructions for how to modify the image',
		typeOptions: {
			rows: 4,
		},
	},
	{
		displayName: 'Image URLs',
		name: 'imageUrls',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['seedream'],
				operation: ['editImage'],
			},
		},
		default: '',
		placeholder: 'https://example.com/image.jpg',
		description: 'URL of the image to edit (comma-separated for multiple images)',
	},
	{
		displayName: 'Aspect Ratio',
		name: 'aspectRatio',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['seedream'],
				operation: ['editImage'],
			},
		},
		options: [
			{ name: '1:1 (Square)', value: '1:1' },
			{ name: '4:3 (Landscape)', value: '4:3' },
			{ name: '3:4 (Portrait)', value: '3:4' },
			{ name: '16:9 (Widescreen)', value: '16:9' },
			{ name: '9:16 (Vertical)', value: '9:16' },
			{ name: '2:3 (Portrait)', value: '2:3' },
			{ name: '3:2 (Landscape)', value: '3:2' },
			{ name: '21:9 (Ultra-wide)', value: '21:9' },
		],
		default: '1:1',
		description: 'Aspect ratio of the output image',
	},
	{
		displayName: 'Quality',
		name: 'quality',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['seedream'],
				operation: ['editImage'],
			},
		},
		options: [
			{ name: 'Basic (2K)', value: 'basic' },
			{ name: 'High (4K)', value: 'high' },
		],
		default: 'basic',
		description: 'Quality level of the output image',
	},

	// Get Task Fields
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['seedream'],
				operation: ['getTask'],
			},
		},
		default: '',
		placeholder: 'task_seedream_1765166238716',
		description: 'The task ID returned from text-to-image or edit operation',
	},

	// Common Optional Fields
	{
		displayName: 'Callback URL',
		name: 'callBackUrl',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['seedream'],
				operation: ['textToImage', 'editImage'],
			},
		},
		default: '',
		placeholder: 'https://your-domain.com/webhook',
		description: 'Webhook URL to receive completion notifications (recommended for production)',
	},

	// Info notice
	{
		displayName: 'Note: Tasks are processed asynchronously. Use "Get Task" operation to check status and retrieve results.',
		name: 'asyncNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: ['seedream'],
				operation: ['textToImage', 'editImage'],
			},
		},
		default: '',
	},
];
