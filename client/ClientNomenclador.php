<?php
class ClientNomenclador extends ClientPlugin implements GuiProvider, ServerCaller, Ajaxable
{
    public $result;
    public $request;
    public $error;

    public function __construct()
    {
        parent::__construct();
    }

    protected function renderFormPrepare()
    {
    }

    public function renderForm(Smarty $template)
    {
        $this->addScripts2Template($template,'plugins','*',false);
    }

    public function isNomencladorAction($actionName){
        $actionName = explode('.',$actionName);
        $pluginName = $actionName[0];

        return $pluginName == 'Nomenclador';
    }

    public function handleHttpPostRequest($request)
    {
        if($this->isNomencladorAction($request['ajaxActionRequest']) && isset($request['params'])){
            $this->request = json_decode($request['params'],true);
        }
        else{
            $this->request = $request;
        }
    }

    public function handleHttpGetRequest($request)
    {
        $this->handleHttpPostRequest($request);
    }

    public function ajaxGetPluginResponse(AjaxPluginResponse $ajaxPluginResponse)
    {
        $ajaxPluginResponse->addVariable('result', $this->result);
        $ajaxPluginResponse->addVariable('error', $this->error);

    }

    public function ajaxHandleAction($actionName, PluginEnabler $pluginEnabler)
    {
        if($this->isNomencladorAction($actionName)){
            $pluginEnabler->disableCoreplugins();
            $pluginEnabler->disablePlugins();
            $pluginEnabler->enablePlugin('nomenclador');
        }
    }

    public function buildRequest()
    {
        if ($this->request['action'] != null) {
            $request = new NomencladorRequest();
            $request->value = $this->request;
            $request->action = $this->request['action'];
            return $request;
        }
    }

    public function initializeResult($nomencladorResult)
    {

    }

    public function handleResult($nomencladorResult)
    {
        if ($nomencladorResult == null) return null;
        $this->result = $nomencladorResult->resp;
        $this->error = $nomencladorResult->error;
    }

}

?>
