import api from '../api';
import Workspace from '../models/Workspace';
import * as messageActions from './message';
import * as loadingActions from './loading';

// Action types
export const WORKSPACE_INFO_REQUEST = 'WORKSPACE_INFO_REQUEST';
export const WORKSPACE_INFO_SUCCESS = 'WORKSPACE_INFO_SUCCESS';
export const WORKSPACE_INFO_FAILURE = 'WORKSPACE_INFO_FAILURE';

export const WORKSPACE_STATE_RESET = 'WORKSPACE_STATE_RESET';

const requestWorkspaceInfo = () => ({
  type: WORKSPACE_INFO_REQUEST,
});

const receiveWorkspaceInfo = (data) => ({
  type: WORKSPACE_INFO_SUCCESS,
  data,
  receivedAt: Date.now(),
});

const getWorkspaceInfoFailure = (error) => ({
  type: WORKSPACE_INFO_FAILURE,
  error,
});

export const resetWorkspace = (workspace) => ({
  type: WORKSPACE_STATE_RESET,
  workspace,
});

const fetchCurrentWorkspaceInfo = () => (dispatch) => {
  dispatch(requestWorkspaceInfo());

  if (window.workspaceId) {
    return api.workspace
      .fetchWorkspaceInfo(window.workspaceId)
      .then((res) => {
        dispatch(loadingActions.setLoadingState(true));
        dispatch(receiveWorkspaceInfo(res.data));
        dispatch(resetWorkspace(res.data));
        dispatch(loadingActions.setLoadingState(false));
      })
      .catch((err) => {
        dispatch(getWorkspaceInfoFailure(err));
        dispatch(loadingActions.setLoadingState(false));
      });
  }

  return dispatch(getWorkspaceInfoFailure());
};

export const fetchWorkspaceInfoIfNeeded = () => (dispatch, getState) => {
  return dispatch(fetchCurrentWorkspaceInfo());
};

const createNewWorkspace = async (workspace) => {
  const resCreated = await api.workspace.createWorkspace(workspace);
  const createdWorkspace = resCreated.data;
  window.workspaceId = createdWorkspace.id;
  window.history.pushState(
    '',
    '',
    Urls['analysis:workspace-detail'](createdWorkspace.id)
  );

  return createdWorkspace;
};

const updateWorkspace = async (id, workspace) => {
  const resUpdated = await api.workspace.updateWorkspace(id, workspace);
  const updatedWorkspace = resUpdated.data;
  window.workspaceId = id;
  window.history.pushState('', '', Urls['analysis:workspace-detail'](id));

  return updatedWorkspace;
};

export const saveWorkspace = (name, overwrite, id) => async (
  dispatch,
  getState
) => {
  console.log('Saving workspace ...');
  const state = getState();
  const workspace = new Workspace({ name });
  const contents = {
    colorTags: state.colorTags,
    dataSources: state.dataSources,
    dataset: state.dataset,
    dependencies: state.dependencies,
    selection: state.selection,
    views: state.views,
  };
  workspace.contents = contents;

  if (overwrite) {
    const updatedWorkspace = await updateWorkspace(id, { contents });
    dispatch(receiveWorkspaceInfo(updatedWorkspace));
    dispatch(
      messageActions.setMessage({
        header: 'Info',
        content: 'The workspace is stored.',
        type: 'info',
      })
    );
    dispatch(messageActions.setMessageOpen(true));
    console.log(updatedWorkspace);
    return;
  }

  // create new workspace
  const createdWorkspace = await createNewWorkspace(workspace);
  dispatch(receiveWorkspaceInfo(createdWorkspace));
  dispatch(
    messageActions.setMessage({
      header: 'Info',
      content: 'The workspace is stored.',
      type: 'info',
    })
  );
  dispatch(messageActions.setMessageOpen(true));
  console.log(createdWorkspace);
};
