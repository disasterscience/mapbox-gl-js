
import fs from 'fs';
import path from 'path';
import {supportsPropertyExpression, supportsZoomExpression} from '../src/style-spec/util/properties.js';
import spec from '../src/style-spec/reference/v8.json';
import assert from 'assert';

function flowEnum(values) {
    if (Array.isArray(values)) {
        return values.map(JSON.stringify).join(' | ');
    } else {
        return Object.keys(values).map(JSON.stringify).join(' | ');
    }
}

function flowType(property) {
    if (typeof property.type === 'function') {
        return property.type();
    }

    const baseType = (() => {
        switch (property.type) {
            case 'string':
            case 'number':
            case 'boolean':
                return property.type;
            case 'enum':
                return flowEnum(property.values);
            case 'array':
                if (property.value === 'light-3d') {
                    return 'Array<LightsSpecification>';
                }
                const elementType = flowType(typeof property.value === 'string' ? {type: property.value, values: property.values} : property.value)
                if (property.length) {
                    return `[${Array(property.length).fill(elementType).join(', ')}]`;
                } else {
                    return `Array<${elementType}>`;
                }
            case '$root':
                return 'StyleSpecification';
            case '*':
                return 'mixed';
            default:
                return `${property.type.slice(0, 1).toUpperCase()}${property.type.slice(1)}Specification`;
        }
    })();

    if (supportsPropertyExpression(property)) {
        return `DataDrivenPropertyValueSpecification<${baseType}>`;
    } else if (supportsZoomExpression(property)) {
        return `PropertyValueSpecification<${baseType}>`;
    } else if (property.expression) {
        return `ExpressionSpecification`;
    } else {
        return baseType;
    }
}

function flowProperty(key, property) {
    assert(property, `Property not found in the style-specification for ${key}`);
    if (key === '*') {
        return `[_: string]: ${flowType(property)}`;
    } else {
        return `"${key}"${property.required ? '' : '?'}: ${flowType(property)}`;
    }
}

function flowObjectDeclaration(key, properties) {
    assert(properties, `Properties not found in the style-specification for ${key}`);
    return `export type ${key} = ${flowObject(properties, '', '*' in properties ? '' : '|')}`;
}

function flowObject(properties, indent, sealing = '') {
    return `{${sealing}
${Object.keys(properties)
        .map(k => `    ${indent}${flowProperty(k, properties[k])}`)
        .join(',\n')}
${indent}${sealing}}`
}

function flowSourceTypeName(key) {
    return key.replace(/source_(.)(.*)/, (_, _1, _2) => `${_1.toUpperCase()}${_2}SourceSpecification`)
        .replace(/_dem/, 'DEM')
        .replace(/Geojson/, 'GeoJSON');
}

function flowLightTypeName(key) {
    return key.split('-').map(k => k.replace(/(.)(.*)/, (_, _1, _2) => `${_1.toUpperCase()}${_2}`)).concat('LightSpecification').join('');
}

function flowLayerTypeName(key) {
    return key.split('-').map(k => k.replace(/(.)(.*)/, (_, _1, _2) => `${_1.toUpperCase()}${_2}`)).concat('LayerSpecification').join('');
}

function flowLayer(key) {
    const layer = spec.layer;

    layer.type = {
        type: 'enum',
        values: [key],
        required: true
    };

    delete layer.ref;
    delete layer['paint.*'];

    if (spec[`paint_${key}`]) {
        layer.paint.type = () => {
            return flowObject(spec[`paint_${key}`], '    ', '|');
        };
    } else {
        delete layer.paint;
    }

    if (spec[`layout_${key}`]) {
        layer.layout.type = () => {
            return flowObject(spec[`layout_${key}`], '    ', '|');
        };
    } else {
        delete layer.layout;
    }

    if (key === 'background' || key === 'sky' || key === 'slot') {
        delete layer.source;
        delete layer['source-layer'];
        delete layer.filter;
    } else {
        layer.source.required = true;
    }

    if (key === 'slot') {
        delete layer.minzoom;
        delete layer.maxzoom;
    }

    return flowObjectDeclaration(flowLayerTypeName(key), layer);
}

function flowLight(key) {
    const light = spec['light-3d'];

    light.type = {
        type: 'enum',
        values: [key],
        required: true
    }

    light.properties.type = () => {
        return flowObject(spec[`properties_light_${key}`], '    ', '|');
    };

    return flowObjectDeclaration(flowLightTypeName(key), light);
}

const lightTypes = Object.keys(spec['light-3d'].type.values);

const layerTypes = Object.keys(spec.layer.type.values);

fs.writeFileSync('src/style-spec/types.js', `// @flow
// Generated code; do not edit. Edit build/generate-flow-typed-style-spec.js instead.
/* eslint-disable */

export type ColorSpecification = string;

export type FormattedSpecification = string;

export type ResolvedImageSpecification = string;

export type PromoteIdSpecification = {[_: string]: string} | string;

export type FilterSpecification =
    | ['has', string]
    | ['!has', string]
    | ['==', string, string | number | boolean]
    | ['!=', string, string | number | boolean]
    | ['>', string, string | number | boolean]
    | ['>=', string, string | number | boolean]
    | ['<', string, string | number | boolean]
    | ['<=', string, string | number | boolean]
    | Array<string | FilterSpecification>; // Can't type in, !in, all, any, none -- https://github.com/facebook/flow/issues/2443

export type TransitionSpecification = {
    duration?: number,
    delay?: number
};

// Note: doesn't capture interpolatable vs. non-interpolatable types.

export type CameraFunctionSpecification<T> =
    | {| type: 'exponential', stops: Array<[number, T]> |}
    | {| type: 'interval',    stops: Array<[number, T]> |};

export type SourceFunctionSpecification<T> =
    | {| type: 'exponential', stops: Array<[number, T]>, property: string, default?: T |}
    | {| type: 'interval',    stops: Array<[number, T]>, property: string, default?: T |}
    | {| type: 'categorical', stops: Array<[string | number | boolean, T]>, property: string, default?: T |}
    | {| type: 'identity', property: string, default?: T |};

export type CompositeFunctionSpecification<T> =
    | {| type: 'exponential', stops: Array<[{zoom: number, value: number}, T]>, property: string, default?: T |}
    | {| type: 'interval',    stops: Array<[{zoom: number, value: number}, T]>, property: string, default?: T |}
    | {| type: 'categorical', stops: Array<[{zoom: number, value: string | number | boolean}, T]>, property: string, default?: T |};

export type ExpressionSpecification = Array<mixed>;

export type PropertyValueSpecification<T> =
    | T
    | CameraFunctionSpecification<T>
    | ExpressionSpecification;

export type DataDrivenPropertyValueSpecification<T> =
    | T
    | CameraFunctionSpecification<T>
    | SourceFunctionSpecification<T>
    | CompositeFunctionSpecification<T>
    | ExpressionSpecification;

${flowObjectDeclaration('StyleSpecification', spec.$root)}

${flowObjectDeclaration('SourcesSpecification', spec.sources)}

${flowObjectDeclaration('ModelsSpecification', spec.models)}

${flowObjectDeclaration('LightSpecification', spec.light)}

${flowObjectDeclaration('TerrainSpecification', spec.terrain)}

${flowObjectDeclaration('FogSpecification', spec.fog)}

${flowObjectDeclaration('CameraSpecification', spec.camera)}

${flowObjectDeclaration('ProjectionSpecification', spec.projection)}

${flowObjectDeclaration('ImportSpecification', spec.import)}

${flowObjectDeclaration('ConfigSpecification', spec.config)}

${flowObjectDeclaration('SchemaSpecification', spec.schema)}

${flowObjectDeclaration('OptionSpecification', spec.option)}

${spec.source.map(key => flowObjectDeclaration(flowSourceTypeName(key), spec[key])).join('\n\n')}

export type SourceSpecification =
${spec.source.map(key => `    | ${flowSourceTypeName(key)}`).join('\n')}

export type ModelSpecification = ${flowType(spec.model)};

${lightTypes.map(key => flowLight(key)).join('\n\n')}

export type LightsSpecification =
${lightTypes.map(key => `    | ${flowLightTypeName(key)}`).join('\n')};

${layerTypes.map(key => flowLayer(key)).join('\n\n')}

export type LayerSpecification =
${layerTypes.map(key => `    | ${flowLayerTypeName(key)}`).join('\n')};

`);
