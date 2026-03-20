import inquirer from 'inquirer';
import { OpenClawWorkspace } from './discovery';

export interface InteractiveSelectionResult {
  selectedWorkspaces: string[];
  includeWecomConfig: boolean;
}

/**
 * Interactive prompt to select which workspaces to include
 */
export async function promptSelection(
  workspaces: OpenClawWorkspace[],
  hasWecomConfig: boolean
): Promise<InteractiveSelectionResult> {
  const questions = [];
  
  // Checkbox for workspaces
  questions.push({
    type: 'checkbox',
    name: 'selectedWorkspaces',
    message: 'Select which workspaces to pack:',
    choices: workspaces.map(w => ({
      name: w.name,
      value: w.name,
      checked: true // default all checked
    }))
  });
  
  // Confirm for wecom config if it exists
  if (hasWecomConfig) {
    questions.push({
      type: 'confirm',
      name: 'includeWecomConfig',
      message: 'Include WeChat Work configuration?',
      default: false
    });
  }
  
  const answers = await inquirer.prompt(questions);
  
  return {
    selectedWorkspaces: answers.selectedWorkspaces,
    includeWecomConfig: hasWecomConfig ? answers.includeWecomConfig : false
  };
}
