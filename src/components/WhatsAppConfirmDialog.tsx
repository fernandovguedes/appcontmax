import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Empresa, MesKey, MES_LABELS } from "@/types/fiscal";
import { Loader2, MessageCircle } from "lucide-react";

interface WhatsAppConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: Empresa;
  mesSelecionado: MesKey;
  onConfirm: () => Promise<void>;
}

function buildMensagem(empresa: Empresa, mesSelecionado: MesKey): string {
  const competencia = `${MES_LABELS[mesSelecionado]}/2026`;
  return `Olá, ${empresa.nome}! Identificamos que o extrato de ${competencia} ainda não foi enviado. Pode nos encaminhar por aqui hoje?`;
}

export function WhatsAppConfirmDialog({ open, onOpenChange, empresa, mesSelecionado, onConfirm }: WhatsAppConfirmDialogProps) {
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [sending, setSending] = useState(false);
  const mensagem = buildMensagem(empresa, mesSelecionado);

  const handleClose = (v: boolean) => {
    if (!v) {
      setEtapa(1);
      setSending(false);
    }
    onOpenChange(v);
  };

  const handleEnviar = async () => {
    setSending(true);
    try {
      await onConfirm();
      handleClose(false);
    } catch {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Enviar WhatsApp
          </DialogTitle>
          <DialogDescription>
            {etapa === 1
              ? "Confirme o envio da mensagem de cobrança de extrato."
              : "Revise a mensagem antes de enviar."}
          </DialogDescription>
        </DialogHeader>

        {etapa === 1 ? (
          <>
            <p className="text-sm text-foreground">
              Você deseja enviar a mensagem de cobrança de extrato para <strong>{empresa.nome}</strong>?
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
              <Button onClick={() => setEtapa(2)}>Continuar</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="rounded-lg border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
              {mensagem}
            </div>
            <p className="text-xs text-muted-foreground">
              Para: {empresa.whatsapp || "Não cadastrado"}
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setEtapa(1)} disabled={sending}>Voltar</Button>
              <Button onClick={handleEnviar} disabled={sending} className="bg-green-600 hover:bg-green-700 text-white">
                {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : "Enviar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
