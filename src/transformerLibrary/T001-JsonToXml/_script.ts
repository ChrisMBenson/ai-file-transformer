import { TransformerConfig } from '../../types';
import { AbstractBaseExecuter } from "../../transformers/executer/baseExecuter";

export default class T001JsonToXml extends AbstractBaseExecuter {

    getOutputFileExtension(config: TransformerConfig): string {
        return ".xml";
    }
}
