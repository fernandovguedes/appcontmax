import { Empresa, MesKey, StatusEntrega, StatusExtrato, calcularDistribuicaoSocios } from "@/types/fiscal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, ExtratoBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, FileText, FileX, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EmpresaTableProps {
  empresas: Empresa[];
  mesSelecionado: MesKey;
  onEdit: (empresa: Empresa) => void;
  onDelete: (id: string) => void;
  onStatusChange: (empresaId: string, mes: MesKey, campo: keyof Empresa["obrigacoes"]["janeiro"], valor: StatusEntrega) => void;
  onExtratoChange: (empresaId: string, mes: MesKey, valor: StatusExtrato) => void;
}

const LIMITE_DISTRIBUICAO_SOCIO = 50000;

export function EmpresaTable({ empresas, mesSelecionado, onEdit, onDelete, onStatusChange, onExtratoChange }: EmpresaTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary/5 hover:bg-primary/5">
            <TableHead className="w-12">Nº</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead className="w-10 text-center">NF</TableHead>
            <TableHead className="text-center">Extrato</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
            <TableHead className="text-right">Dist. Lucros</TableHead>
            <TableHead className="text-center">Lanç. Fiscal</TableHead>
            <TableHead className="text-center">REINF</TableHead>
            <TableHead className="text-center">DCTF Web</TableHead>
            <TableHead className="text-center">MIT</TableHead>
            <TableHead className="w-24 text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                Nenhuma empresa cadastrada.
              </TableCell>
            </TableRow>
          )}
          {empresas.map((empresa) => {
            const ob = empresa.obrigacoes[mesSelecionado];
            const mes = empresa.meses[mesSelecionado];
            const sociosComDistribuicao = calcularDistribuicaoSocios(empresa.socios, mes.distribuicaoLucros);
            const sociosAcima50k = sociosComDistribuicao.filter(s => (s.distribuicaoLucros ?? 0) > LIMITE_DISTRIBUICAO_SOCIO);
            const temAlerta = sociosAcima50k.length > 0;

            return (
              <TableRow key={empresa.id} className={temAlerta ? "bg-destructive/5" : ""}>
                <TableCell className="font-medium">{empresa.numero}</TableCell>
                <TableCell className="font-medium max-w-[180px] truncate">{empresa.nome}</TableCell>
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
                <TableCell className="text-right font-medium">
                  {mes.faturamentoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-medium text-accent">
                      {mes.distribuicaoLucros.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    {temAlerta && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold text-destructive mb-1">⚠️ Sócio(s) acima de R$ 50.000:</p>
                            <ul className="text-xs space-y-1">
                              {sociosAcima50k.map((s, i) => (
                                <li key={i}>
                                  {s.nome} ({s.percentual}%): {(s.distribuicaoLucros ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                {(["lancamentoFiscal", "reinf", "dcftWeb", "mit"] as const).map((campo) => (
                  <TableCell key={campo} className="text-center">
                    <StatusSelect
                      value={ob[campo]}
                      onChange={(v) => onStatusChange(empresa.id, mesSelecionado, campo, v)}
                    />
                  </TableCell>
                ))}
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
