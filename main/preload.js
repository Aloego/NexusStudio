'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// The only things the editor window may ask the desktop app to do.
contextBridge.exposeInMainWorld('nexus', {
  isDesktop: true,
  onAiRequest: function (cb) { ipcRenderer.on('ai:request', function (_e, msg) { cb(msg); }); },
  aiRespond: function (id, ok, payload) { ipcRenderer.send('ai:response', { id: id, ok: !!ok, payload: payload }); },
  newProject: function () { return ipcRenderer.invoke('file:new'); },
  openProject: function () { return ipcRenderer.invoke('file:open'); },
  saveProject: function (text, saveAs, name) { return ipcRenderer.invoke('file:save', { text: text, saveAs: !!saveAs, name: name }); },
  exportPages: function (files, name) { return ipcRenderer.invoke('file:exportPages', { files: files, name: name }); },
  fbPlaces: function () { return ipcRenderer.invoke('fb:places'); },
  fbList: function (a) { return ipcRenderer.invoke('fb:list', a); },
  fbMkdir: function (a) { return ipcRenderer.invoke('fb:mkdir', a); },
  fbSaveProject: function (a) { return ipcRenderer.invoke('fb:saveProject', a); },
  fbExportHtml: function (a) { return ipcRenderer.invoke('fb:exportHtml', a); },
  fbExportPages: function (a) { return ipcRenderer.invoke('fb:exportPages', a); },
  fbRead: function (a) { return ipcRenderer.invoke('fb:read', a); },
  exportHtml: function (text, name) { return ipcRenderer.invoke('file:export', { text: text, name: name }); },
  importHtml: function () { return ipcRenderer.invoke('file:importHtml'); },
  setPreview: function (html) { return ipcRenderer.invoke('preview:set', html); },
  setDocName: function (name) { ipcRenderer.send('win:docname', name); },
  mcpInfo: function () { return ipcRenderer.invoke('mcp:info'); },
  mcpSetEnabled: function (on) { return ipcRenderer.invoke('mcp:enable', !!on); },
  mcpInstallClaudeDesktop: function () { return ipcRenderer.invoke('mcp:installClaudeDesktop'); },
  docsOpenOnline: function (tag, site) { return ipcRenderer.invoke('docs:openOnline', tag, site); },
  docsOpenZeal: function (tag) { return ipcRenderer.invoke('docs:openZeal', tag); },
  docsSetZealPath: function (p) { return ipcRenderer.invoke('docs:setZealPath', p); },
  onAiActivity: function (cb) { ipcRenderer.on('ai:activity', function (_e, msg) { cb(msg); }); }
});
