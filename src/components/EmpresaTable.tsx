import { Empresa, MesKey, StatusEntrega, StatusExtrato, calcularDistribuicaoSocios, isMesFechamentoTrimestre, MESES_FECHAMENTO_TRIMESTRE, getMesesTrimestre, REGIME_LABELS } from "@/types/fiscal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, ExtratoBadge } from "@/components/StatusBadge";
import { DistribuicaoSociosPopover } from "@/components/DistribuicaoSociosPopover";
import { FaturamentoPopover } from "@/components/FaturamentoPopover";
import { ReinfAlert } from "@/components/ReinfAlert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, FileText, FileX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface EmpresaTableProps {
  empresas: Empresa[];
  mesSelecionado: MesKey;
  onEdit: (empresa: Empresa) => void;
  onDelete: (id: string) => void;
  onStatusChange: (empresaId: string, mesTrimestre: typeof MESES_FECHAMENTO_TRIMESTRE[number], campo: keyof Empresa["obrigacoes"]["marco"], valor: StatusEntrega) => void;
  onExtratoChange: (empresaId: string, mes: MesKey, valor: StatusExtrato) => void;
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

export function EmpresaTable({ empresas, mesSelecionado, onEdit, onDelete, onStatusChange, onExtratoChange }: EmpresaTableProps) {
  const isFechamento = isMesFechamentoTrimestre(mesSelecionado);
  const mesTrimestre = getMesFechamentoTrimestre(mesSelecionado);

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary/5 hover:bg-primary/5">
            <TableHead className="w-12">Nº</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead className="w-20 text-center">Regime</TableHead>
            <TableHead className="w-10 text-center">NF</TableHead>
            <TableHead className="text-center">Extrato</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
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
            <TableHead className="w-24 text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.length === 0 && (
            <TableRow>
              <TableCell colSpan={isFechamento ? 13 : 8} className="h-24 text-center text-muted-foreground">
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

            return (
              <TableRow key={empresa.id} className={temAlerta || temAlertaTrimestral ? "bg-destructive/5" : ""}>
                <TableCell className="font-medium">{empresa.numero}</TableCell>
                <TableCell className="font-medium max-w-[180px] truncate">{empresa.nome}</TableCell>
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
                      <StatusSelect
                        value={empresa.obrigacoes[mesTrimestre].mit}
                        onChange={(v) => onStatusChange(empresa.id, mesTrimestre, "mit", v)}
                      />
                    </TableCell>
                  </>
                )}
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(empresa)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(empresa.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusSelect({ value, onChange }: { value: StatusEntrega; onChange: (v: StatusEntrega) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as StatusEntrega)}>
      <SelectTrigger className="h-8 w-[110px] mx-auto border-0 bg-transparent p-0 focus:ring-0 [&>svg]:ml-1">
        <StatusBadge status={value} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ok">✅ OK</SelectItem>
        <SelectItem value="pendente">❌ Pendente</SelectItem>
        <SelectItem value="nao_aplicavel">➖ N/A</SelectItem>
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
