import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Empresa, MesKey, MES_LABELS } from "@/types/fiscal";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BatchResult {
  empresaId: string;
  to: string;
  success: boolean;
  error: string | null;
  ticketId: string | null;
  empresaNome?: string;
}

interface WhatsAppBatchConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresas: Empresa[];
  mesSelecionado: MesKey;
  onComplete: () => void;
}

type Step = "confirm1" | "confirm2" | "sending" | "done";

export function WhatsAppBatchConfirmDialog({ open, onOpenChange, empresas, mesSelecionado, onComplete }: WhatsAppBatchConfirmDialogProps) {
  const [step, setStep] = useState<Step>("confirm1");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const competencia = `${MES_LABELS[mesSelecionado]}/2026`;
  const templateMsg = `Olá, {empresa}! Identificamos que o extrato de ${competencia} ainda não foi enviado. Pode nos encaminhar por aqui hoje?`;

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  const handleClose = (openState: boolean) => {
    if (step === "sending") return; // prevent closing during send
    if (!openState) {
      setStep("confirm1");
      setProgress(0);
      setResults([]);
      setShowDetails(false);
      onOpenChange(false);
    }
  };

  const handleSend = async () => {
    setStep("sending");
    setProgress(0);

    const items = empresas.map((e) => ({
      empresaId: e.id,
      to: e.whatsapp!,
      body: `Olá, ${e.nome}! Identificamos que o extrato de ${competencia} ainda não foi enviado. Pode nos encaminhar por aqui hoje?`,
    }));

    // Simulate progress while waiting for response
    const total = items.length;
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    let currentProgress = 0;

    progressInterval = setInterval(() => {
      currentProgress = Math.min(currentProgress + (90 / total), 90);
      setProgress(currentProgress);
    }, 800);

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-batch", {
        body: { items, ticketStrategy: "create", closeAfterSend: true },
      });

      if (progressInterval) clearInterval(progressInterval);
      setProgress(100);

      if (error || !data?.results) {
        setResults(items.map((item) => ({
          empresaId: item.empresaId,
          to: item.to,
          success: false,
          error: error?.message || "Falha na comunicação",
          ticketId: null,
          empresaNome: empresas.find((e) => e.id === item.empresaId)?.nome,
        })));
      } else {
        setResults(
          data.results.map((r: any) => ({
            ...r,
            empresaNome: empresas.find((e) => e.id === r.empresaId)?.nome,
          }))
        );
      }
    } catch (err) {
      if (progressInterval) clearInterval(progressInterval);
      setProgress(100);
      setResults(items.map((item) => ({
        empresaId: item.empresaId,
        to: item.to,
        success: false,
        error: "Erro inesperado",
        ticketId: null,
        empresaNome: empresas.find((e) => e.id === item.empresaId)?.nome,
      })));
    }

    setStep("done");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "confirm1" && "Envio em lote de WhatsApp"}
            {step === "confirm2" && "Confirmar envio"}
            {step === "sending" && "Enviando mensagens..."}
            {step === "done" && "Resumo do envio"}
          </DialogTitle>
          <DialogDescription>
            {step === "confirm1" && `Você deseja enviar mensagem de cobrança para ${empresas.length} empresa${empresas.length !== 1 ? "s" : ""}?`}
            {step === "confirm2" && `Confirmar envio de ${empresas.length} mensagen${empresas.length !== 1 ? "s" : ""} agora?`}
            {step === "sending" && "Aguarde enquanto as mensagens são enviadas."}
            {step === "done" && "Confira o resultado do envio abaixo."}
          </DialogDescription>
        </DialogHeader>

        {step === "confirm1" && (
          <>
            <ScrollArea className="max-h-60">
              <ul className="space-y-1 text-sm">
                {empresas.map((e) => (
                  <li key={e.id} className="flex justify-between py-1 border-b last:border-0">
                    <span className="truncate mr-2">{e.nome}</span>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">{e.whatsapp}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
              <Button onClick={() => setStep("confirm2")}>Continuar</Button>
            </DialogFooter>
          </>
        )}

        {step === "confirm2" && (
          <>
            <div className="rounded-md border p-3 bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Template:</p>
              <p className="text-sm italic">{templateMsg}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("confirm1")}>Voltar</Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSend}>Enviar</Button>
            </DialogFooter>
          </>
        )}

        {step === "sending" && (
          <div className="space-y-3 py-4">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">
              Enviando {Math.min(Math.ceil((progress / 100) * empresas.length), empresas.length)}/{empresas.length}...
            </p>
          </div>
        )}

        {step === "done" && (
          <>
            <div className="flex gap-4 justify-center py-2">
              <div className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{successCount} sucesso{successCount !== 1 ? "s" : ""}</span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">{errorCount} erro{errorCount !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>

            <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
              {showDetails ? "Ocultar detalhes" : "Ver detalhes"}
            </Button>

            {showDetails && (
              <ScrollArea className="max-h-48">
                <ul className="space-y-1 text-sm">
                  {results.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 py-1 border-b last:border-0">
                      {r.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <span className="truncate">{r.empresaNome || r.to}</span>
                      {r.error && <span className="text-xs text-destructive ml-auto">{r.error}</span>}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}

            <DialogFooter>
              <Button onClick={() => { handleClose(false); onComplete(); }}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
