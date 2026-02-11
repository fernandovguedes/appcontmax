import { useRef, useEffect, useState } from "react";
import { Empresa, MesKey, StatusEntrega, StatusExtrato, StatusQuestor, calcularDistribuicaoSocios, isMesFechamentoTrimestre, MESES_FECHAMENTO_TRIMESTRE, getMesesTrimestre, isMesDctfPosFechamento, getTrimestreFechamentoAnterior, calcularFaturamentoTrimestre } from "@/types/fiscal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, ExtratoBadge, QuestorBadge } from "@/components/StatusBadge";
import { DistribuicaoSociosPopover } from "@/components/DistribuicaoSociosPopover";
import { FaturamentoPopover } from "@/components/FaturamentoPopover";
import { ReinfAlert } from "@/components/ReinfAlert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, FileText, FileX, DollarSign, Archive, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface EmpresaTableProps {
  empresas: Empresa[];
  mesSelecionado: MesKey;
  canEdit?: boolean;
  onEdit?: (empresa: Empresa) => void;
  onFaturamento?: (empresa: Empresa) => void;
  onDelete?: (id: string) => void;
  onBaixar?: (empresa: Empresa) => void;
  onReativar?: (empresa: Empresa) => void;
  onStatusChange: (empresaId: string, mesTrimestre: typeof MESES_FECHAMENTO_TRIMESTRE[number], campo: keyof Empresa["obrigacoes"]["marco"], valor: StatusEntrega) => void;
  onExtratoChange: (empresaId: string, mes: MesKey, valor: StatusExtrato) => void;
  onMesFieldChange: (empresaId: string, mes: MesKey, campo: string, valor: any) => void;
}

const LIMITE_DISTRIBUICAO_SOCIO = 50000;

function getMesFechamentoTrimestre(mes: MesKey): typeof MESES_FECHAMENTO_TRIMESTRE[number] {
  if (["janeiro", "fevereiro", "marco"].includes(mes)) return "marco";
  if (["abril", "maio", "junho"].includes(mes)) return "junho";
  if (["julho", "agosto", "setembro"].includes(mes)) return "setembro";
  return "dezembro";
}

function calcularDistribuicaoTrimestral(empresa: Empresa, mesFechamento: MesKey): number {
  const meses = getMesesTrimestre(mesFechamento);
  const totalFaturamento = meses.reduce((sum, m) => sum + empresa.meses[m].faturamentoTotal, 0);
  return totalFaturamento * 0.75;
}

export function EmpresaTable({ empresas, mesSelecionado, canEdit = true, onEdit, onFaturamento, onDelete, onBaixar, onReativar, onStatusChange, onExtratoChange, onMesFieldChange }: EmpresaTableProps) {
  const isFechamento = isMesFechamentoTrimestre(mesSelecionado);
  const mesTrimestre = getMesFechamentoTrimestre(mesSelecionado);
  const isDctfPos = isMesDctfPosFechamento(mesSelecionado);
  const trimestreAnterior = getTrimestreFechamentoAnterior(mesSelecionado);
  const colCount = 9 + (isFechamento ? 5 : 0) + (isDctfPos ? 1 : 0);

  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const scrollbarContentRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const scrollbar = scrollbarRef.current;
    const scrollbarContent = scrollbarContentRef.current;
    if (!container || !scrollbar || !scrollbarContent) return;

    const sync = () => {
      const hasOverflow = container.scrollWidth > container.clientWidth;
      if (hasOverflow) {
        const rect = container.getBoundingClientRect();
        scrollbar.style.display = 'block';
        scrollbar.style.left = `${rect.left}px`;
        scrollbar.style.width = `${rect.width}px`;
        scrollbarContent.style.width = `${container.scrollWidth}px`;
      } else {
        scrollbar.style.display = 'none';
      }
    };

    requestAnimationFrame(sync);
    const interval = setInterval(sync, 200);
    const observer = new ResizeObserver(() => requestAnimationFrame(sync));
    observer.observe(container);
    if (tableRef.current) observer.observe(tableRef.current);
    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, [isFechamento, isDctfPos, empresas.length, mesSelecionado]);

  const handleContainerScroll = () => {
    if (syncing.current) return;
    syncing.current = true;
    if (scrollbarRef.current && containerRef.current) {
      scrollbarRef.current.scrollLeft = containerRef.current.scrollLeft;
    }
    syncing.current = false;
  };

  const handleScrollbarScroll = () => {
    if (syncing.current) return;
    syncing.current = true;
    if (containerRef.current && scrollbarRef.current) {
      containerRef.current.scrollLeft = scrollbarRef.current.scrollLeft;
    }
    syncing.current = false;
  };

  return (
    <div className="flex flex-col">
    <div ref={containerRef} onScroll={handleContainerScroll} className="rounded-lg border bg-card overflow-x-auto">
      <Table ref={tableRef} className="min-w-max">
        <TableHeader>
          <TableRow className="bg-primary/5 hover:bg-primary/5">
            <TableHead className="w-12">Nº</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead className="w-20 text-center">Regime</TableHead>
            <TableHead className="w-10 text-center">NF</TableHead>
            <TableHead className="text-center">Extrato</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
            <TableHead className="text-center">Lanç. Questor</TableHead>
            <TableHead className="text-right">Dist. Lucros</TableHead>
            {isFechamento && (
              <>
                <TableHead className="text-right">Dist. Trimestral</TableHead>
                <TableHead className="text-center">Lanç. Fiscal</TableHead>
                <TableHead className="text-center">REINF</TableHead>
                <TableHead className="text-center">DCTF Web</TableHead>
                <TableHead className="text-center">MIT</TableHead>
              </>
            )}
            {isDctfPos && (
              <TableHead className="text-center">DCTF S/Mov</TableHead>
            )}
            <TableHead className="w-24 text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.length === 0 && (
            <TableRow>
              <TableCell colSpan={colCount} className="h-24 text-center text-muted-foreground">
                Nenhuma empresa cadastrada.
              </TableCell>
            </TableRow>
          )}
          {empresas.map((empresa) => {
            const mes = empresa.meses[mesSelecionado];
            const sociosComDistribuicao = calcularDistribuicaoSocios(empresa.socios, mes.distribuicaoLucros);
            const temAlerta = sociosComDistribuicao.some(s => (s.distribuicaoLucros ?? 0) > LIMITE_DISTRIBUICAO_SOCIO);

            const distribuicaoTrimestral = isFechamento ? calcularDistribuicaoTrimestral(empresa, mesSelecionado) : 0;
            const sociosTrimestrais = isFechamento ? calcularDistribuicaoSocios(empresa.socios, distribuicaoTrimestral) : [];
            const temAlertaTrimestral = sociosTrimestrais.some(s => (s.distribuicaoLucros ?? 0) > LIMITE_DISTRIBUICAO_SOCIO);

            const fatTrimestreAnterior = trimestreAnterior ? calcularFaturamentoTrimestre(empresa, trimestreAnterior) : 0;
            const reinfObrigatoria = fatTrimestreAnterior > 0;

            return (
              <TableRow key={empresa.id} className={temAlerta || temAlertaTrimestral ? "bg-destructive/5" : ""}>
                <TableCell className="font-medium">{empresa.numero}</TableCell>
                <TableCell className="font-medium max-w-[180px] truncate">
                  <div className="flex items-center gap-2">
                    <span className={empresa.dataBaixa ? "text-destructive" : ""}>{empresa.nome}</span>
                    {empresa.dataBaixa && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 whitespace-nowrap">
                        BAIXADA EM {format(new Date(empresa.dataBaixa), "dd/MM/yyyy")}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={empresa.regimeTributario === "simples_nacional" ? "secondary" : "outline"} className="text-[10px] px-1.5">
                    {empresa.regimeTributario === "simples_nacional" ? "SN" : "LP"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        {empresa.emiteNotaFiscal ? (
                          <FileText className="h-4 w-4 text-success mx-auto" />
                        ) : (
                          <FileX className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        {empresa.emiteNotaFiscal ? "Emite NF" : "Não emite NF"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-center">
                  <ExtratoSelect
                    value={mes.extratoEnviado}
                    onChange={(v) => onExtratoChange(empresa.id, mesSelecionado, v)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <FaturamentoPopover dados={mes} />
                </TableCell>
                <TableCell className="text-center">
                  <QuestorSelect
                    value={mes.lancadoQuestor}
                    onChange={(v) => onMesFieldChange(empresa.id, mesSelecionado, "lancadoQuestor", v)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <DistribuicaoSociosPopover 
                    socios={empresa.socios} 
                    distribuicaoTotal={mes.distribuicaoLucros}
                    label="Mensal"
                  />
                </TableCell>
                {isFechamento && (
                  <>
                    <TableCell className="text-right">
                      <DistribuicaoSociosPopover 
                        socios={empresa.socios} 
                        distribuicaoTotal={distribuicaoTrimestral}
                        label="Trimestral"
                        isTrimestral
                        detalhesMensais={getMesesTrimestre(mesSelecionado).map(m => ({
                          mes: m,
                          faturamento: empresa.meses[m].faturamentoTotal,
                          distribuicao: empresa.meses[m].faturamentoTotal * 0.75,
                        }))}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusSelect
                        value={empresa.obrigacoes[mesTrimestre].lancamentoFiscal}
                        onChange={(v) => onStatusChange(empresa.id, mesTrimestre, "lancamentoFiscal", v)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <StatusSelect
                          value={empresa.obrigacoes[mesTrimestre].reinf}
                          onChange={(v) => onStatusChange(empresa.id, mesTrimestre, "reinf", v)}
                        />
                        <ReinfAlert empresa={empresa} mesFechamento={mesTrimestre} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusSelect
                        value={empresa.obrigacoes[mesTrimestre].dcftWeb}
                        onChange={(v) => onStatusChange(empresa.id, mesTrimestre, "dcftWeb", v)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {empresa.regimeTributario === "lucro_presumido" ? (
                        <StatusSelect
                          value={empresa.obrigacoes[mesTrimestre].mit}
                          onChange={(v) => onStatusChange(empresa.id, mesTrimestre, "mit", v)}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </>
                )}
                {isDctfPos && (
                  <TableCell className="text-center">
                    {reinfObrigatoria ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-accent font-medium">REINF enviada</span>
                        <StatusSelect
                          value={mes.dctfWebSemMovimento ?? "pendente"}
                          onChange={(v) => onMesFieldChange(empresa.id, mesSelecionado, "dctfWebSemMovimento", v)}
                          options={[
                            { value: "ok", label: "✅ OK" },
                            { value: "pendente", label: "❌ Pendente" },
                          ]}
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    {onFaturamento && (
                      <Button variant="ghost" size="icon" onClick={() => onFaturamento(empresa)} title="Faturamento">
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    )}
                    {canEdit && onEdit && (
                      <Button variant="ghost" size="icon" onClick={() => onEdit(empresa)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canEdit && onReativar && onBaixar && (
                      empresa.dataBaixa ? (
                        <Button variant="ghost" size="icon" onClick={() => onReativar(empresa)} title="Reativar empresa" className="text-success hover:text-success">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => onBaixar(empresa)} title="Baixar empresa" className="text-warning hover:text-warning">
                          <Archive className="h-4 w-4" />
                        </Button>
                      )
                    )}
                    {canEdit && onDelete && (
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(empresa.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    <div
      ref={scrollbarRef}
      onScroll={handleScrollbarScroll}
      className="z-50 overflow-x-scroll bg-background border-t shadow-[0_-2px_6px_rgba(0,0,0,0.1)]"
      style={{ position: 'fixed', bottom: 0, height: '20px', display: 'none' }}
    >
      <div ref={scrollbarContentRef} style={{ height: '1px', width: '1px' }} />
    </div>
    </div>
  );
}

function StatusSelect({ value, onChange, options }: { value: StatusEntrega; onChange: (v: StatusEntrega) => void; options?: { value: string; label: string }[] }) {
  const defaultOptions = [
    { value: "ok", label: "✅ OK" },
    { value: "pendente", label: "❌ Pendente" },
    { value: "nao_aplicavel", label: "➖ N/A" },
  ];
  const items = options ?? defaultOptions;
  return (
    <Select value={value} onValueChange={(v) => onChange(v as StatusEntrega)}>
      <SelectTrigger className="h-8 w-[110px] mx-auto border-0 bg-transparent p-0 focus:ring-0 [&>svg]:ml-1">
        <StatusBadge status={value} />
      </SelectTrigger>
      <SelectContent>
        {items.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ExtratoSelect({ value, onChange }: { value: StatusExtrato; onChange: (v: StatusExtrato) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as StatusExtrato)}>
      <SelectTrigger className="h-8 w-[130px] mx-auto border-0 bg-transparent p-0 focus:ring-0 [&>svg]:ml-1">
        <ExtratoBadge status={value} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="sim">✅ Enviado</SelectItem>
        <SelectItem value="nao">❌ Não Enviado</SelectItem>
        <SelectItem value="sem_faturamento">➖ Sem Faturamento</SelectItem>
      </SelectContent>
    </Select>
  );
}

function QuestorSelect({ value, onChange }: { value: StatusQuestor; onChange: (v: StatusQuestor) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as StatusQuestor)}>
      <SelectTrigger className="h-8 w-[120px] mx-auto border-0 bg-transparent p-0 focus:ring-0 [&>svg]:ml-1">
        <QuestorBadge status={value} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ok">✅ OK</SelectItem>
        <SelectItem value="sem_faturamento">➖ Sem Faturamento</SelectItem>
        <SelectItem value="pendente">❌ Pendente</SelectItem>
      </SelectContent>
    </Select>
  );
}
