# VS Code AI Transformers Plugin

The **VS Code AI Transformers Plugin** is a tool designed to automate and streamline AI-powered workflows directly within the VS Code environment. This plugin offers a customisable and intuitive interface for processing files using AI, enabling users to execute complex tasks efficiently. At the heart of the plugin are **Transformers**, each designed to process matching files from the input folder, execute the AI call for each file, and create the specified outputs.

---

## **General Configuration**

### **AI Models**
- Select from a variety of AI models, including OpenAI, Anthropic, and Mistral AI.
- Configure API keys for each model to enable access to their capabilities.
- Set the maximum number of concurrent API calls to manage resource usage and avoid rate limits.
- Enable parallel processing for improved performance.

---

## **Transformer Configuration**

Configuration of a single transformer involves the following options:

### **Name**
- Assign a unique name to the transformer for identification and management.

### **Description**
- Provide a brief description of the transformer's purpose and functionality.

### **Input File**
- Specify input files using wildcard filters (e.g., `*.txt`, `src/**/*.js`) with optional subfolder inclusion.

### **Prompt**
- Craft AI instructions using a prompt editor, with the ability to include metadata like filename, folder, or content snippets.
- Adjust AI options such as temperature and model type for fine-tuning results.

### **Output File**
- Define the output folder and configure naming conventions for output files (e.g., appending `_transformed`, timestamps).
- Option to preserve the input folder structure within the output directory.

---

## **Transformer Management**

Manage transformers through an intuitive user interface with the following capabilities:

### **Create and Duplicate Transformers**
- Easily create new transformers or duplicate existing ones for quick customisation and adaptation to new tasks.

### **Edit Transformers**
- Modify transformer settings, including input/output configurations and prompts.

### **Delete Transformers**
- Remove obsolete transformers to maintain an organised workspace.

### **Find Existing Transformers**
- Browse an online library of existing transformers for easy discovery and reuse. Selecting one loads it into the user's workspace. *(Planned Feature)*

---

## **Execution and Results**

### **Execution Options**
- Run transformers with a single command or click.
- Option to exclude or redo tasks where output files already exist.

### **Progress and Feedback**
- Display progress indicators during execution.
- Provide real-time logs with detailed updates and feedback for each processed file.

