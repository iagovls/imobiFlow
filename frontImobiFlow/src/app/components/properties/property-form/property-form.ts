import { Component, Input, OnInit, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Imovel, ImovelCreate, ImovelUpdate, PropertiesService, Finalidade } from '../../../services/properties.service';
import { LocationsService, UF, Cidade, Bairro, Regiao, Comodidade } from '../../../services/locations.service';
import { NotifyLeadsModalComponent } from '../notify-leads-modal/notify-leads-modal';
import { NgClass } from '@angular/common';
import {
  LucideArrowLeft,
  LucideSave,
  LucideImage,
  LucideTag,
  LucideMapPin,
  LucideDollarSign,
  LucideRuler,
  LucideInfo,
  LucidePackage,
  LucideBuilding2,
  LucideTreeDeciduous,
  LucideAlertTriangle,
  LucideToggleLeft,
  LucideToggleRight,
} from '@lucide/angular';

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass, NotifyLeadsModalComponent, LucideArrowLeft, LucideSave, LucideImage, LucideTag, LucideMapPin, LucideDollarSign, LucideRuler, LucideInfo, LucidePackage, LucideBuilding2, LucideTreeDeciduous, LucideAlertTriangle, LucideToggleLeft, LucideToggleRight],
  templateUrl: './property-form.html',
  styleUrl: './property-form.css',
})
export class PropertyFormComponent implements OnInit, OnChanges {
  @Input() imovel: Imovel | null = null;
  @Input() isNew = false;

  @Output() goBack = new EventEmitter<void>();
  @Output() openImages = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Imovel>();

  form!: FormGroup;
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  activeToggle = signal(true);

  tiposImovel = [
    'Apartamento', 'Casa', 'Casa de Condomínio', 'Sobrado',
    'Cobertura', 'Flat', 'Loft', 'Studio', 'Terreno',
    'Comercial', 'Sala Comercial', 'Galpão', 'Depósito', 'Outros'
  ];

  ufs = signal<UF[]>([]);
  cidades = signal<Cidade[]>([]);
  bairros = signal<Bairro[]>([]);
  regioes = signal<Regiao[]>([]);
  comodidadesDisponiveis = signal<Comodidade[]>([]);
  comodidadesSelecionadas = signal<Set<number>>(new Set());

  criandoCidade = signal(false);
  criandoBairro = signal(false);
  criandoRegiao = signal(false);
  criandoComodidade = signal(false);
  mostrarNotificarLeads = signal(false);

  constructor(
    private fb: FormBuilder,
    private propertiesService: PropertiesService,
    private locationsService: LocationsService,
  ) {
    this.buildForm();
  }

  private async carregarLocalizacaoInicial() {
    const [ufs, comodidades] = await Promise.all([
      this.locationsService.getUFs(),
      this.locationsService.getComodidades(),
    ]);
    this.ufs.set(ufs);
    this.comodidadesDisponiveis.set(comodidades);
  }

  private buildForm() {
    this.form = this.fb.group({
      imv_codigo: [{ value: '', disabled: true }],
      titulo: ['', []],
      tipo: ['Apartamento', [Validators.required]],
      finalidade: ['venda' as Finalidade, [Validators.required]],
      fonte_url: ['', []],

      endereco: ['', []],

      uf_id: [null as number | null, [Validators.required]],
      cidade_id: [null as number | null, [Validators.required]],
      bairro_id: [null as number | null, []],
      regiao_id: [null as number | null, []],

      preco: [0, [Validators.required, Validators.min(0)]],
      preco_mensal: [false, []],
      condominio_preco: [null as number | null, []],
      iptu_preco: [null as number | null, []],

      quartos: [null as number | null, []],
      suites: [null as number | null, []],
      banheiros: [null as number | null, []],
      vagas_carro: [null as number | null, []],
      andar: [null as number | null, []],
      area_util_m2: [null as number | null, []],
      area_total_m2: [null as number | null, []],
      ano: [null as number | null, []],
      mobiliado: ['', []],
      aceita_pet: [true, []],

      destaques: ['', []],
      comodidades: ['', []],
      proximidades: ['', []],
      condicoes: ['', []],
      restricoes: ['', []],
      active: [true, []],
    });
  }

  async ngOnInit() {
    await this.carregarLocalizacaoInicial();
    await this.patchFormFromImovel();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['imovel']) {
      void this.patchFormFromImovel();
    }
  }

  private carregandoCodigo = false;

  private async carregarProximoCodigo() {
    if (this.carregandoCodigo) return;
    this.carregandoCodigo = true;
    try {
      const proximo = await this.propertiesService.getNextCodigo();
      const semPrefixo = proximo.startsWith('IMV-') ? proximo.slice(4) : proximo;
      this.form.get('imv_codigo')?.setValue(semPrefixo);
    } finally {
      this.carregandoCodigo = false;
    }
  }

  private async patchFormFromImovel() {
    if (this.imovel) {
      const codigo = this.imovel.imv_codigo ?? '';
      const codigoSemPrefixo = codigo.startsWith('IMV-') ? codigo.slice(4) : codigo;
      this.form.patchValue({
        imv_codigo: codigoSemPrefixo,
        titulo: this.imovel.titulo ?? '',
        tipo: this.imovel.tipo ?? 'Apartamento',
        finalidade: this.imovel.finalidade ?? 'venda',
        fonte_url: this.imovel.fonte_url ?? '',
        endereco: this.imovel.endereco ?? '',
        uf_id: this.imovel.uf_id ?? null,
        cidade_id: this.imovel.cidade_id ?? null,
        bairro_id: this.imovel.bairro_id ?? null,
        regiao_id: this.imovel.regiao_id ?? null,
        preco: this.imovel.preco ?? 0,
        preco_mensal: this.imovel.preco_mensal ?? false,
        condominio_preco: this.imovel.condominio_preco ?? null,
        iptu_preco: this.imovel.iptu_preco ?? null,
        quartos: this.imovel.quartos ?? null,
        suites: this.imovel.suites ?? null,
        banheiros: this.imovel.banheiros ?? null,
        vagas_carro: this.imovel.vagas_carro ?? null,
        andar: this.imovel.andar ?? null,
        area_util_m2: this.imovel.area_util_m2 ?? null,
        area_total_m2: this.imovel.area_total_m2 ?? null,
        ano: this.imovel.ano ?? null,
        mobiliado: this.imovel.mobiliado ?? '',
        aceita_pet: this.imovel.aceita_pet ?? true,
        destaques: this.imovel.destaques ?? '',
        comodidades: this.imovel.comodidades ?? '',
        proximidades: this.imovel.proximidades ?? '',
        condicoes: this.imovel.condicoes ?? '',
        restricoes: this.imovel.restricoes ?? '',
        active: this.imovel.active ?? true,
      });
      this.activeToggle.set(this.imovel.active ?? true);

      if (this.imovel.uf_id) {
        this.cidades.set(await this.locationsService.getCidades(this.imovel.uf_id));
      }
      if (this.imovel.cidade_id) {
        const [bairros, regioes] = await Promise.all([
          this.locationsService.getBairros(this.imovel.cidade_id),
          this.locationsService.getRegioes(this.imovel.cidade_id),
        ]);
        this.bairros.set(bairros);
        this.regioes.set(regioes);
      }

      const comodidadeIds = await this.propertiesService.getImovelComodidadeIds(this.imovel.id);
      this.comodidadesSelecionadas.set(new Set(comodidadeIds));
    } else {
      this.form.reset({
        tipo: 'Apartamento',
        finalidade: 'venda',
        preco: 0,
        preco_mensal: false,
        aceita_pet: true,
        active: true,
      });
      this.activeToggle.set(true);
      this.cidades.set([]);
      this.bairros.set([]);
      this.regioes.set([]);
      this.comodidadesSelecionadas.set(new Set());
      const ba = this.ufs().find((uf) => uf.sigla === 'BA');
      if (ba) {
        this.form.patchValue({ uf_id: ba.id });
        this.cidades.set(await this.locationsService.getCidades(ba.id));
      }
      this.carregarProximoCodigo();
    }
  }

  async onUfChange(ufIdStr: string) {
    const ufId = ufIdStr ? Number(ufIdStr) : null;
    this.form.patchValue({ uf_id: ufId, cidade_id: null, bairro_id: null, regiao_id: null });
    this.cidades.set(ufId ? await this.locationsService.getCidades(ufId) : []);
    this.bairros.set([]);
    this.regioes.set([]);
  }

  async onCidadeChange(cidadeIdStr: string) {
    const cidadeId = cidadeIdStr ? Number(cidadeIdStr) : null;
    this.form.patchValue({ cidade_id: cidadeId, bairro_id: null, regiao_id: null });
    if (cidadeId) {
      const [bairros, regioes] = await Promise.all([
        this.locationsService.getBairros(cidadeId),
        this.locationsService.getRegioes(cidadeId),
      ]);
      this.bairros.set(bairros);
      this.regioes.set(regioes);
    } else {
      this.bairros.set([]);
      this.regioes.set([]);
    }
  }

  onBairroChange(bairroIdStr: string) {
    const bairroId = bairroIdStr ? Number(bairroIdStr) : null;
    this.form.patchValue({ bairro_id: bairroId });
  }

  onRegiaoChange(regiaoIdStr: string) {
    const regiaoId = regiaoIdStr ? Number(regiaoIdStr) : null;
    this.form.patchValue({ regiao_id: regiaoId });
  }

  async criarCidade(nome: string) {
    const ufId = this.form.get('uf_id')?.value;
    if (!nome.trim() || !ufId) return;
    const cidade = await this.locationsService.createCidade(ufId, nome.trim());
    if (cidade) {
      this.cidades.update((list) => [...list, cidade].sort((a, b) => a.nome.localeCompare(b.nome)));
      this.form.patchValue({ cidade_id: cidade.id, bairro_id: null, regiao_id: null });
      this.bairros.set([]);
      this.regioes.set([]);
    }
    this.criandoCidade.set(false);
  }

  async criarBairro(nome: string) {
    const cidadeId = this.form.get('cidade_id')?.value;
    if (!nome.trim() || !cidadeId) return;
    const bairro = await this.locationsService.createBairro(cidadeId, nome.trim());
    if (bairro) {
      this.bairros.update((list) => [...list, bairro].sort((a, b) => a.nome.localeCompare(b.nome)));
      this.form.patchValue({ bairro_id: bairro.id });
    }
    this.criandoBairro.set(false);
  }

  async criarRegiao(nome: string) {
    const cidadeId = this.form.get('cidade_id')?.value;
    if (!nome.trim() || !cidadeId) return;
    const regiao = await this.locationsService.createRegiao(cidadeId, nome.trim());
    if (regiao) {
      this.regioes.update((list) => [...list, regiao].sort((a, b) => a.nome.localeCompare(b.nome)));
      this.form.patchValue({ regiao_id: regiao.id });
    }
    this.criandoRegiao.set(false);
  }

  async criarComodidade(nome: string) {
    if (!nome.trim()) return;
    const comodidade = await this.locationsService.createComodidade(nome.trim());
    if (comodidade) {
      this.comodidadesDisponiveis.update((list) =>
        [...list, comodidade].sort((a, b) => a.nome.localeCompare(b.nome)),
      );
      this.toggleComodidade(comodidade.id);
    }
    this.criandoComodidade.set(false);
  }

  toggleComodidade(id: number) {
    this.comodidadesSelecionadas.update((set) => {
      const novo = new Set(set);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  voltar() {
    if (this.form.dirty && !this.isNew) {
      const confirmado = window.confirm('Existem alterações não salvas. Deseja realmente voltar?');
      if (!confirmado) return;
    }
    this.goBack.emit();
  }

  abrirImagens() {
    this.openImages.emit();
  }

  async salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    try {
      const rawValue = this.form.getRawValue();
      rawValue.active = this.activeToggle();
      rawValue.comodidades = this.comodidadesDisponiveis()
        .filter((c) => this.comodidadesSelecionadas().has(c.id))
        .map((c) => c.nome)
        .join(', ');

      let result: Imovel | null;

      if (this.isNew || !this.imovel) {
        // Código é atribuído automaticamente pelo PropertiesService.
        const createPayload: ImovelCreate = {
          ...rawValue,
          imv_codigo: '',
          imagem_principal: this.imovel?.imagem_principal ?? null,
        };
        result = await this.propertiesService.createImovel(createPayload);
      } else {
        rawValue.imv_codigo = this.imovel.imv_codigo;
        const updatePayload: ImovelUpdate = {
          id: this.imovel.id,
          ...rawValue,
          imagem_principal: this.imovel.imagem_principal,
        };
        result = await this.propertiesService.updateImovel(updatePayload);
      }

      if (result) {
        await this.propertiesService.setImovelComodidades(
          result.id,
          Array.from(this.comodidadesSelecionadas()),
        );
        this.form.markAsPristine();
        this.saved.emit(result);
      } else if (this.isNew || !this.imovel) {
        this.errorMessage.set('Não foi possível gerar um código único para o imóvel. Tente novamente.');
      } else {
        this.errorMessage.set('Erro ao salvar imóvel. Tente novamente.');
      }
    } catch (err) {
      console.error(err);
      this.errorMessage.set('Ocorreu um erro inesperado ao salvar.');
    } finally {
      this.saving.set(false);
    }
  }

  toggleActive() {
    this.activeToggle.set(!this.activeToggle());
  }

  fieldClass(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control) return '';
    if (control.touched && control.invalid) {
      return 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50/30';
    }
    return 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500';
  }
}
