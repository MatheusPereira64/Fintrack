package com.fintrackapp.notification;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Package names dos apps bancários conhecidos.
 * Deve permanecer alinhado com BankRegistry.ts e &lt;queries&gt; no AndroidManifest.
 */
public final class BankPackages {

    private BankPackages() {}

    public static final Set<String> ALL = Collections.unmodifiableSet(new LinkedHashSet<>(Arrays.asList(
        // Nubank (atual + legado)
        "com.nu.production",
        "com.nubank.nubank",
        // Inter
        "br.com.intermedium",
        "com.bancointer.banking",
        // Itaú
        "com.itau",
        "com.itau.pf.android",
        "com.itau.empresas",
        "br.com.itau",
        "br.com.itau.personnalite",
        // Bradesco / Next
        "com.bradesco",
        "com.bradesco.prime",
        "br.com.bradesco",
        "br.com.bradesco.next",
        // Banco do Brasil
        "com.bb.android",
        "br.com.bb.android",
        // Santander
        "com.santander.app",
        "com.santander.way",
        // C6
        "br.com.c6bank.app",
        "com.c6bank.app",
        // Caixa
        "br.gov.caixa.internet.smartphones",
        "br.gov.caixa.internet",
        "br.com.gabba.Caixa",
        // Carteiras / digitais
        "com.mercadopago.wallet",
        "com.picpay",
        "br.com.original.bank",
        "br.com.uol.ps.myaccount",
        "br.com.neon.app",
        "com.neon.bank.android.prd",
        "com.willbank",
        "br.com.willbank",
        // Outros comuns
        "br.com.sicoob.sisbr",
        "br.com.sicoob.mobile",
        "br.com.sicredi.mobile",
        "com.xpi.app",
        "br.com.meliuz"
    )));
}
