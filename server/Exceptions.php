<?php
/**
 * Created by PhpStorm.
 * User: mano
 * Date: 10/03/17
 * Time: 8:47
 */

class DFSCycle extends Exception{
    private $m;
    public function __construct($message, $code = 0, Exception $previous = null)
    {
        $this->m = $message;
        parent::__construct($message, $code, $previous);
    }
    public function __toString()
    {
        return $this->m;
    }
}
class LayerNotFound extends Exception{
    private $m;
    public $layerName;
    public function __construct($message,   $layerName, $code = 0, Exception $previous = null)
    {
        $this->layerName = $layerName;
        $this->m = $message;
        parent::__construct($message, $code, $previous);
    }
    public function __toString()
    {
        return $this->m;
    }
}

class EnumException extends Exception{
    public $typeException;

    public function getExceptionObj(){
        return array('type'=>$this->typeException);
    }
}

class EnumDBNotExistException extends EnumException
{
    public $typeException = 'EnumDBNotExistException';
}
class EnumCantBeRemovedIsRefException extends EnumException
{
    public $enumId;
    public $enumName;
    public $typeException = 'EnumCantBeRemovedIsRefException';

    public function __construct($enumId, $enumName, $message)
    {
        $this->enumId = $enumId;
        $this->enumName = $enumName;

        parent::__construct( isset($message)?$message :"El nomenclador: $enumName no puede ser borrado.");
    }
    public function getExceptionObj()
    {
        $r = parent::getExceptionObj();
        $r['msg'] = $this->message;
        return $r;
    }
}

class EnumActionRejected extends EnumException{}

class EnumRevisionConflict extends EnumException{
    public function __construct(){
        parent::__construct('Hubo conflicto con las revisiones de los records',409,null);
    }
}

class EnumInvalidModifyingData extends EnumException{
    public function __construct($enumInstance,$enum,$field, $data)
    {
        $msg = "El dato '$data' del campo '$field' del nomenclador '$enum' de la instancia '$enumInstance', no esta formado correctamente";
        parent::__construct($msg, 400, null);
    }
}
class InvalidModelRevision extends EnumException{
    public function __construct()
    {
        $msg = "Recargue los nomencladores, el nomenclador que estas modificando ha cambiado.";
        parent::__construct($msg, 409, null);
    }
}