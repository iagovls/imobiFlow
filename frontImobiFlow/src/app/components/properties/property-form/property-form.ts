import { Component, Input, OnInit, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Imovel, ImovelCreate, ImovelUpdate, PropertiesService, Finalidade } from '../../../services/properties.service';
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
  imports: [ReactiveFormsModule, NgClass, LucideArrowLeft, LucideSave, LucideImage, LucideTag, LucideMapPin, LucideDollarSign, LucideRuler, LucideInfo, LucidePackage, LucideBuilding2, LucideTreeDeciduous, LucideAlertTriangle, LucideToggleLeft, LucideToggleRight],
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

  ufLista = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

  constructor(
    private fb: FormBuilder,
    private propertiesService: PropertiesService,
  ) {
    this.buildForm();
  }

  private buildForm() {
    this.form = this.fb.group({
      imv_codigo: [{ value: '', disabled: true }],
      titulo: ['', []],
      tipo: ['Apartamento', [Validators.required]],
      finalidade: ['venda' as Finalidade, [Validators.required]],
      fonte_url: ['', []],

      uf: ['BA', [Validators.required]],
      cidade: ['', [Validators.required]],
      bairro: ['', []],
      regiao_cidade: ['', []],
      endereco: ['', []],

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

  ngOnInit() {
    this.patchFormFromImovel();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['imovel']) {
      this.patchFormFromImovel();
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

  private patchFormFromImovel() {
    if (this.imovel) {
      const codigo = this.imovel.imv_codigo ?? '';
      const codigoSemPrefixo = codigo.startsWith('IMV-') ? codigo.slice(4) : codigo;
      this.form.patchValue({
        imv_codigo: codigoSemPrefixo,
        titulo: this.imovel.titulo ?? '',
        tipo: this.imovel.tipo ?? 'Apartamento',
        finalidade: this.imovel.finalidade ?? 'venda',
        fonte_url: this.imovel.fonte_url ?? '',
        uf: this.imovel.uf ?? 'BA',
        cidade: this.imovel.cidade ?? '',
        bairro: this.imovel.bairro ?? '',
        regiao_cidade: this.imovel.regiao_cidade ?? '',
        endereco: this.imovel.endereco ?? '',
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
    } else {
      this.form.reset({
        tipo: 'Apartamento',
        finalidade: 'venda',
        uf: 'BA',
        preco: 0,
        preco_mensal: false,
        aceita_pet: true,
        active: true,
      });
      this.activeToggle.set(true);
      this.carregarProximoCodigo();
    }
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
