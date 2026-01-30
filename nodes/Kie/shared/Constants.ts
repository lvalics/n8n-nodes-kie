/**
 * Shared constants and options for Kie.ai nodes
 */

/**
 * Aspect ratio options for image generation
 * Available across all Kie.ai image models
 */
export const ASPECT_RATIO_OPTIONS = [
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
];

/**
 * Quality options for image generation
 * Available across all Kie.ai image models
 */
export const QUALITY_OPTIONS = [
	{
		name: 'Basic',
		value: 'basic',
	},
	{
		name: 'High',
		value: 'high',
	},
];
