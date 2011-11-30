(function($, window, document, aes) {
    'use strict';

    var privateMethods = {};
    var instance;

    function UInterface() {
        return privateMethods.init(this);
    }

    // Private methods

    privateMethods.mainEvents = function() {
        $('#channels').on('click', 'button.channel', privateMethods.tab.activate);
        $('#channels').on('click', 'button.remove', privateMethods.tab.remove);

        $('#loading').fadeOut('fast', function () {
            $('#channels').fadeIn();
            $('#channels-content').fadeIn();
        });

        var srcWindowHeight = $('html').height();
        var srcPanelsHeight = $('#channel-list').height();
        var srcSidebarHeight = $('#channel-list').height();

        $(window).resize(function (event) {
            if (event.target !== window) return;

            var scrollable = $('#channels-content section .scrollableArea').filter(':visible');
            var visibleChannelName = scrollable.parent().parent().attr('id');

            var minChatWidth = 310;
            var separatorWidth = 17;
            var footerHeight = 53;

            $('.scrollableArea').css('height', ($('.chat:last').height() - parseInt($('scrollableArea').css('padding-bottom'))) + 'px');

            if ($('#channel-list').css('height') != 'auto')
                $('#channel-list').css('height', (srcPanelsHeight + $('html').height() - srcWindowHeight) + 'px');

            if ($('aside.sidebar').css('height') != 'auto')
                $('aside.sidebar').css('height', (srcSidebarHeight - footerHeight + $('html').height() - srcWindowHeight) + 'px');

            $('aside.sidebar').each(function(idx, sidebar) {
                sidebar = $(sidebar);
                if (sidebar.css('left') != 'auto') {
                    if (sidebar.is(':visible') === true) {
                        var value = sidebar.css('left');
                        sidebar.css('left', (sidebar.parent().find('.chat').width() + separatorWidth) + 'px');
                        if (parseInt(sidebar.parent().find('.chat').css('right')) >= (sidebar.width() + separatorWidth) && privateMethods.tab.switching) {
                            sidebar.css('left', value);
                        }
                    } else {
                        sidebar.css('left', (sidebar.parent().find('.chat').width() + separatorWidth - sidebar.width()) + 'px');
                    }
                }
            });

            if (privateMethods.sidebar.resizing || privateMethods.channels.resizing) return;

            privateMethods.tab.autoWidth();

            if (scrollable.parent().innerWidth() <= minChatWidth && ($.jStorage.get('#' + visibleChannelName + '-sidebar-show') == null || $.jStorage.get('#' + visibleChannelName + '-sidebar-show') === false)) {
                privateMethods.sidebar.hide('#' + visibleChannelName, false, function() {
                    if (scrollable.parent().innerWidth() <= minChatWidth && ($.jStorage.get('channel-list') === null | $.jStorage.get('channel-list') === false)) {
                        privateMethods.channels.hide();
                    }
                });
            } else if (scrollable.parent().innerWidth() - $('#' + visibleChannelName).find('aside.sidebar').innerWidth() - privateMethods.sidebar.separatorWidth > minChatWidth && ($.jStorage.get('#' + visibleChannelName + '-sidebar-show') == null || $.jStorage.get('#' + visibleChannelName + '-sidebar-show') === true)) {
                privateMethods.sidebar.show('#' + visibleChannelName, false, function() {
                    if (scrollable.parent().innerWidth() - $('#channel-list').outerWidth() + separatorWidth + 10 /* padding */ > minChatWidth && ($.jStorage.get('channel-list') == null || $.jStorage.get('channel-list') === true)) {
                        privateMethods.channels.show();
                    }
                });
            }

            scrollable.prop({ scrollTop: scrollable.prop('scrollHeight') });
        });

        $('section.account h1').accordion({ items: 'section.account form.clearfix' });
        $('section.help h1').accordion({ items: 'section.help div.clearfix' });
        $('section.help .helpscroll li').accordion({ items: 'section.help p' });

        $().scroller({
            scrollableArea: $('section.help div.helpscroll .scrollableArea'),
            spotUp: $('section.help div.helpscroll .scrollingHotSpotUp'),
            spotDown: $('section.help div.helpscroll .scrollingHotSpotDown'),
            mouseArea: $('section.help div.helpscroll')
        });

        $().scroller({
            scrollableArea: $('section.help div.rulesscroll .scrollableArea'),
            spotUp: $('section.help div.rulesscroll .scrollingHotSpotUp'),
            spotDown: $('section.help div.rulesscroll .scrollingHotSpotDown'),
            mouseArea: $('section.help div.rulesscroll')
        });

        $('section.help button.close, #bottom #help').on('click', function() {
            privateMethods.layers.toogle('help');
        });

        $(document).on('contextmenu', function() {
            return false;
        });

        $('form').attr('novalidate', 'novalidate');
    };

    privateMethods.userpic = {
        init: function () {
            $('#userpic').uploadify({
                swf: '/flash/uploadify.swf',
                checkExisting: false,
                auto: true,
                cancelImage: false,
                buttonText: 'Загрузить',
                fileTypeExts: '*.jpg;*.gif;*.png',
                fileTypeDesc: 'Изображения (.JPG, .GIF, .PNG)',
                fileSizeLimit: 10,
                width: '90',
                height: '25',
                onUploadStart: privateMethods.userpic.onUploadStart,
                onUploadSuccess: privateMethods.userpic.onUploadSuccess,
                onUploadError: privateMethods.userpic.onUploadError,
                onSelect: privateMethods.userpic.onSelect,
                onSelectError: privateMethods.userpic.onSelectError
            });
        },
        onUploadStart: function () {
            $('#userpic').uploadifySettings('buttonText', 'Загрузка...');
        },
        onUploadSuccess: function (file, data, response) {
            if (response) {
                data = JSON.parse(data);
                if (data.error) {
                    $.jGrowl(data.error, { header: 'Ошибка' });
                    $('#userpic').uploadifySettings('buttonText', 'Загрузить');
                } else {
                    $('img.userpic').attr('src', '/userpics/' + data.pic);
                    $.fn.sys().options.currentUser.pic = data.pic;
                    $('#userpic').uploadifySettings('buttonText', 'Загружено');
                    setTimeout(function () {
                        $('#userpic').uploadifySettings('buttonText', 'Загрузить');
                    }, 3000);
                }
            }
        },
        onUploadError: function () {
            $.jGrowl('Неизвестная ошибка', { header: 'Ошибка' });
            return false;
        },
        onSelect: function () {
            $('#userpic').uploadifySettings('uploader', '/user/' + encodeURIComponent(aes.enc($.fn.sys().options.currentUser.id, $.fn.sys().options.serverKey)) + '/pic');
        },
        onSelectError: function (file, errorCode) {
            switch (errorCode) {
                case SWFUpload.QUEUE_ERROR.FILE_EXCEEDS_SIZE_LIMIT:
                    $.jGrowl('Размер файла не должен превышать 10КБ (60х60)', { header: 'Ошибка' });
                    break;
                case SWFUpload.QUEUE_ERROR.ZERO_BYTE_FILE:
                    $.jGrowl('Файл пуст', { header: 'Ошибка' });
                    break;
                case SWFUpload.QUEUE_ERROR.INVALID_FILETYPE:
                    $.jGrowl('Недопустимый формат файла', { header: 'Ошибка' });
                    break;
                default:
                    $.jGrowl('Неизвестная ошибка', { header: 'Ошибка' });
            }
            return false;
        }
    };

    privateMethods.account = function () {
        $('#top').on('click', '#user #account', function () {
            if ($.fn.sys().options.currentUser.pic) {
                $('img.userpic').attr('src', '/userpics/' + $.fn.sys().options.currentUser.pic);
            } else {
                $('img.userpic').attr('src', '/images/web/userpic2.png');
            }

            $('section.account input[name="user[name]"]').val($.fn.sys().options.currentUser.name);

            if ($.fn.sys().options.currentUser.email) {
                $('section.account input[name="user[email]"]').val($.fn.sys().options.currentUser.email);
            }

            if ($('section.account input[value="1"]').prop('checked')) $('section.account span.male').trigger('click');
            if ($('section.account input[value="2"]').prop('checked')) $('section.account span.female').trigger('click');

            if ($.fn.sys().options.currentUser.gender != 'N') {
                if ($.fn.sys().options.currentUser.gender === 'M') {
                    $('section.account span.male').trigger('click');
                } else if ($.fn.sys().options.currentUser.gender === 'W') {
                    $('section.account span.female').trigger('click');
                }
            }

            $('section.account form.audio-settings span.switch.checked').trigger('click');
            $('section.account form.audio-settings input[type=checkbox]').prop('checked', false);

            if ($.fn.sys().options.currentUser.settings.audio.whenAway)
                $('section.account form.audio-settings span.when-away').trigger('click');
            if ($.fn.sys().options.currentUser.settings.audio.whenUnavailable)
                $('section.account form.audio-settings span.when-unavailable').trigger('click');
            if ($.fn.sys().options.currentUser.settings.audio.onMessage)
                $('section.account form.audio-settings span.on-message').trigger('click');
            if ($.fn.sys().options.currentUser.settings.audio.onPrivate)
                $('section.account form.audio-settings span.on-private').trigger('click');
            if ($.fn.sys().options.currentUser.settings.audio.onMention)
                $('section.account form.audio-settings span.on-mention').trigger('click');
            if ($.fn.sys().options.currentUser.settings.audio.onEnter)
                $('section.account form.audio-settings span.on-enter').trigger('click');
            if ($.fn.sys().options.currentUser.settings.audio.onExit)
                $('section.account form.audio-settings span.on-exit').trigger('click');

            $('section.account form.interface-settings span.switch.checked').trigger('click');
            $('section.account form.interface-settings input[type=checkbox]').prop('checked', false);

            if ($.fn.sys().options.currentUser.settings['interface'].flashTabOnMessage)
                $('section.account form.interface-settings span.flashTabOnMessage').trigger('click');
            if ($.fn.sys().options.currentUser.settings['interface'].flashTabOnMention)
                $('section.account form.interface-settings span.flashTabOnMention').trigger('click');
            if ($.fn.sys().options.currentUser.settings['interface'].chatNotifications)
                $('section.account form.interface-settings span.chatNotifications').trigger('click');

            privateMethods.layers.toogle('account');
        });

        $('section.account span.male').on('click', function () {
            if (!$('section.account input[value="1"]').prop('checked')) {
                $('section.account span.female').removeClass('checked');
                $(this).addClass('checked');
                $('section.account input[value="2"]').prop('checked', false);
                $('section.account input[value="1"]').prop('checked', true);
                try {
                    yaCounter6276298.hit('/user/account/male', null, null, {
                        user: $.fn.sys().options.currentUser.name
                    });
                } catch (e) {}
            } else {
                $(this).removeClass('checked');
                $('section.account input[value="1"]').prop('checked', false);
                try {
                    yaCounter6276298.hit('/user/account/neutral', null, null, {
                        user: $.fn.sys().options.currentUser.name
                    });
                } catch (e) {}
            }
        });

        $('section.account span.female').on('click', function () {
            if (!$('section.account input[value="2"]').prop('checked')) {
                $('section.account span.male').removeClass('checked');
                $(this).addClass('checked');
                $('section.account input[value="1"]').prop('checked', false);
                $('section.account input[value="2"]').prop('checked', true);
                try {
                    yaCounter6276298.hit('/user/account/female', null, null, {
                        user: $.fn.sys().options.currentUser.name
                    });
                } catch (e) {}
            } else {
                $(this).removeClass('checked');
                $('section.account input[value="2"]').prop('checked', false);
                try {
                    yaCounter6276298.hit('/user/account/neutral', null, null, {
                        user: $.fn.sys().options.currentUser.name
                    });
                } catch (e) {}
            }
        });

        $('section.account form.audio-settings span.switch, section.account form.interface-settings span.switch').on('click', function () {
            if ($(this).prev().prop('checked')) {
                $(this).removeClass('checked').html('off');
                $(this).prev().prop('checked', false);
            } else {
                $(this).addClass('checked').html('on');
                $(this).prev().prop('checked', true);
            }
        });

        $('section.account button.cancel').on('click', function () {
            privateMethods.layers.toogle('account');
            return false;
        });

        var accountOverlay = {
            message: 'Сохранение...',
            css: {
                'border': 'none',
                'background': 'transparent',
                'height': '25px',
                'line-height': '25px',
                'color': '#C4B1C4',
                'font-size': '1.1em'
            },
            overlayCSS: {
                opacity: 0.6,
                backgroundColor: '#4A324A'
            }
        };

        $('section.account form.account').submit(function () {
            $('section.account').block(accountOverlay);

            $.post('/user/account', $('section.account form.account input').serialize()).success(function (data) {
                if (data.error) return $.jGrowl(data.error, { header: 'Ошибка' });

                $.jGrowl('Сохранение завершено', { header: 'Уведомление' });

                privateMethods.layers.toogle('account', function() {
                    try {
                        yaCounter6276298.hit('/user/account', null, null, {
                            user: $.fn.sys().options.currentUser.name
                        });
                    } catch (e) {}
                });
            }).error(function () {
                $.jGrowl('Не удалось сохранить данные аккаунта', { header: 'Ошибка' });
            }).complete(function () {
                $('section.account').unblock();
            });

            return false;
        });

        $('section.account form.audio-settings, section.account form.interface-settings').submit(function () {
            $('section.account').block(accountOverlay);

            if ($(this).hasClass('audio-settings')) {
                var settings = $('section.account form.audio-settings input[type=checkbox]').serializeObject();
                settings.section = 'audio';
            } else if ($(this).hasClass('interface-settings')) {
                settings = $('section.account form.interface-settings input[type=checkbox]').serializeObject();
                settings.section = 'interface';
            }

            $.post('/user/settings', settings).success(function (data) {
                if (data.error) return $.jGrowl(data.error, { header: 'Ошибка' });

                $.jGrowl('Сохранение завершено', { header: 'Уведомление' });
                $.fn.sys().options.updateUser($.extend({}, $.fn.sys().options.currentUser, { settings: data }));

                privateMethods.layers.toogle('account', function() {
                    try {
                        yaCounter6276298.hit('/user/account', null, null, {
                            user: $.fn.sys().options.currentUser.name
                        });
                    } catch (e) {}
                });
            }).error(function () {
                $.jGrowl('Не удалось сохранить настройки', { header: 'Ошибка' });
            }).complete(function () {
                $('section.account').unblock();
            });
            return false;
        });

        $('#top #login #forgot, section.forgot button.cancel').on('click', function() {
            privateMethods.layers.toogle('forgot', null);
            return false;
        });

        $('section.forgot form.forgot').submit(function () {
            $('section.forgot').block($.extend(true, {}, accountOverlay, { message: 'Отправка...' }));

            $.post('/user/forgot', $('section.forgot form.forgot input').serialize()).success(function (data) {
                if (data.error) {
                    return $.jGrowl(data.error, { header: 'Ошибка' });
                }

                $.jGrowl('На ваш email отправлены сведения для восстановления пароля', { header: 'Уведомление' });

                privateMethods.layers.toogle('forgot', function() {
                    try {
                        yaCounter6276298.hit('/user/forgot', null, null, null);
                    } catch (e) {}
                });
            }).error(function () {
                $.jGrowl('Не удалось отправить данные для восстановления пароля', { header: 'Ошибка' });
            }).complete(function () {
                $('section.forgot').unblock();
            });

            return false;
        });
    };

    privateMethods.smiles = function () {
        $('#channels-content div#smiles img').on('click', function () {
            $('#message').val($('#message').val() + ' [:' + $(this).attr('src').split(/\./)[0].split('/')[3] + ':] ').focus();
            $('#bottom button#smile').trigger('click');
        }).jail({ event: 'mouseover', selector: '#bottom button#smile' });

        $('#bottom button#smile').on('click', function () {
            if ($('#container').css('opacity') === '0') return;

            if ($('#channels-content div#smiles').is(':visible')) {
                $('#channels-content div#smiles').hide('slide', {
                    direction: 'down'
                }, 'fast', function () {
                    $('#bottom button#smile').removeClass('pressed');
                });
            } else {
                $('#channels-content div#smiles').show('slide', {
                    direction: 'down'
                }, 'fast', function () {
                    $('#bottom button#smile').addClass('pressed');
                });
            }
            return false;
        });
    };

    privateMethods.statuses = function () {
        $('#top').on('click', '#user button.switch', function () {
            var parent = $(this).parent();
            if (parent.hasClass('closed')) {
                $('#user div.statuses').fadeIn('fast', function () {
                    parent.removeClass('closed');
                    parent.addClass('opened');
                });
                $(this).text('◄');
            } else if (parent.hasClass('opened')) {
                $('#user div.statuses').fadeOut('fast', function () {
                    parent.removeClass('opened');
                    parent.addClass('closed');
                });
                $(this).text('►');
            }
            return false;
        });

        $('body').on('click', '#user div.statuses button', function () {
            $.fn.sys().status.change($(this).attr('id'));
            $.fn.sys().options.updateUser($.extend({}, $.fn.sys().options.currentUser, { overrideStatus: $(this).attr('id') != 'online' }));
            $('#user button.switch').trigger('click');
        });
    };

    privateMethods.tab = {
        switching: false,
        remove: function () {
            privateMethods.tab.unreadCounter($(this).parent());

            var channelButton = $(this).parent().find('.channel');
            var tabId = channelButton.attr('id');
            var channelId = tabId.substr(8, tabId.length);

            $.fn.sys().fayeClient.unsubscribe('/channel/' + channelId);
            $.fn.sys().fayeClient.unsubscribe('/channel/' + channelId + '/users');

            if (channelButton.data('private')) {
                $.fn.sys().fayeClient.unsubscribe('/channel/' + channelId + '/private');
            }

            $('#' + tabId + '-content').hide('fade', 'fast', function() {
                $(this).remove();
            });

            $(this).parent().hide('puff', { direction: 'up' }, 'fast', function() {
                $(this).remove();

                var idx = $.fn.sys().subscriptions.indexOf(channelId);

                if (idx > 0) {
                    $.fn.sys().subscriptions.splice(idx, 1);
                    $.fn.sys().options.updateSubscriptions($.fn.sys().subscriptions);
                }

                if ($('#channels li.current').length === 0 && $('#channels li').not('.arrow').length > 0) {
                    $('#channels li').not('.arrow').last().addClass('current').find('button.channel').trigger('click');
                }

                privateMethods.tab.autoWidth();
            });
        },

        activate: function () {
            var tabContent = $('#' + $(this).attr('id') + '-content');
            var scrollable = tabContent.find('.scrollableArea');
            var button = this;
            var minChatWidth = 310;
            var separatorWidth = 17;

            if (tabContent.filter(':visible').size() > 0) return;

            privateMethods.tab.switching = true;

            $('#channels-content section').fadeOut('fast');

            tabContent.fadeIn('fast', function() {
                $('aside.sidebar').each(function(idx, sidebar) {
                    sidebar = $(sidebar);
                    if (sidebar.css('left') != 'auto') {
                        if (sidebar.is(':visible') === true) {
                            sidebar.css('left', (sidebar.parent().find('.chat').width() + separatorWidth) + 'px');
                            sidebar.css('opacity', '1');
                        } else {
                            sidebar.css('opacity', '0');
                            sidebar.css('left', (sidebar.parent().find('.chat').width() + separatorWidth - sidebar.width()) + 'px');
                        }
                    }
                });

                if (!privateMethods.sidebar.resizing && !privateMethods.channels.resizing) {
                    if (tabContent.find('.chat').innerWidth() <= minChatWidth) {
                        privateMethods.sidebar.hide('#' + tabContent.attr('id'), false);
                    } else if (tabContent.find('.chat').innerWidth() - $('#' + tabContent.attr('id')).find('aside.sidebar').innerWidth() - privateMethods.sidebar.separatorWidth > minChatWidth) {
                        privateMethods.sidebar.show('#' + tabContent.attr('id'), false);
                    }
                }

                privateMethods.tab.switching = false;
            });

            $('#channels li').not('.arrow').removeClass('current');
            $(button).parent().addClass('current');
            scrollable.prop({ scrollTop: scrollable.prop('scrollHeight') });
            $(document).prop('title', $(document).prop('title').replace(/(?:\/\/\s).+$/, '// ' + $(button).find('span.name').text()));
            privateMethods.tab.unreadCounter(button);
            $(button).stop(true, true).next().stop(true, true);
        },

        autoWidth: function() {
            var tabs = $('#channels li').not('.arrow');
            var tabsToShow = [];
            var tabsToHide = [];
            var width = privateMethods.tab.checkWidth();
            var widthSum = 0;
            var i;

            tabs.each(function(idx, tab) {
                widthSum += $(tab).outerWidth();
                if (widthSum >= width.containerWidth && $(tab).is(':visible')) tabsToHide.push(idx);
                if (widthSum < width.containerWidth && $(tab).not(':visible')) tabsToShow.push(idx);
            });

            if (tabsToHide.length > 0) {
                for (i = 0; i <= tabsToHide.length; i++) {
                    (function(i) {
                        $(tabs[tabsToHide[i]]).fadeOut('fast', function() {
                            if (i === tabsToHide.length - 1) privateMethods.tab.updateArrow();
                        });
                    })(i);
                }
            }

            if (tabsToShow.length > 0) {
                for (i = 0; i <= tabsToShow.length; i++) {
                    (function(i) {
                        $(tabs[tabsToShow[i]]).fadeIn('fast', function() {
                            if (i === tabsToShow.length - 1) privateMethods.tab.updateArrow();
                        });
                    })(i);
                }
            }
        },

        checkWidth: function() {
            var containerWidth = $('#channels').innerWidth() - ($('#channels li.arrow').is(':visible') ? 48 : 0);
            var widthSum = 0;

            $('#channels li').not('.arrow').each(function(idx, tab) {
                widthSum += $(tab).outerWidth();
            });

            return { isOut: widthSum >= containerWidth, containerWidth: containerWidth };
        },

        updateArrow: function() {
            var hiddenTabsCount = $('#channels li').not('.arrow').not(':visible').length;
            var arrowVisible = $('#channels li.arrow').is(':visible');

            $('#channels li.arrow div.counter').text(hiddenTabsCount.toString());

            if (hiddenTabsCount === 0 && arrowVisible) {
                $('#channels li.arrow').fadeOut('fast');
            }

            if (hiddenTabsCount >= 1 && !arrowVisible) {
                $('#channels li.arrow').fadeIn('fast', function() {
                    $('#channels li').filter(':visible').not('.arrow').last().find('button.channel').trigger('click');
                });
            }
        }
    };

    privateMethods.sidebar = {
        resizing: false,
        paddingWidth: 3,
        separatorWidth: 11,

        hide: function (channelName, remember, callback) {
            if (typeof remember === 'undefined') remember = true;

            $(channelName + ' .sidebar').fadeOut('fast', function () {
                $(channelName + ' .chat').animate({
                    'right': privateMethods.sidebar.separatorWidth + privateMethods.sidebar.paddingWidth + 'px'
                }, 'fast', function () {
                    $(channelName).removeClass('use-sidebar');
                    if (remember) $.jStorage.set(channelName + '-sidebar-show', false);
                    if (typeof callback === 'function') callback();
                });
                $(channelName + ' .separator').animate({ 'right': '1px' }, 'fast');
            });
        },

        show: function (channelName, remember, callback) {
            if (typeof remember === 'undefined') remember = true;

            if ($(channelName + ' .sidebar').is('visible')) {
                if (typeof callback === 'function') callback();
                return;
            }

            function complete() {
                var scrollable = $('#channels-content section .scrollableArea').filter(':visible');
                scrollable.prop({ scrollTop: scrollable.prop('scrollHeight') });
                $(channelName).addClass('use-sidebar');
                if (remember) $.jStorage.set(channelName + '-sidebar-show', true);
                privateMethods.sidebar.resizing = false;
                if (typeof callback === 'function') callback();
            }

            if ($.jStorage.get(channelName + '-sidebar-size') != null) {
                $(channelName + ' .chat').animate({
                    'right': (parseInt($.jStorage.get(channelName + '-sidebar-size')) + privateMethods.sidebar.separatorWidth + (privateMethods.sidebar.paddingWidth * 2)) + 'px'
                }, 'fast', complete);
                $(channelName + ' .separator').animate({
                    'right': (parseInt($.jStorage.get(channelName + '-sidebar-size')) + privateMethods.sidebar.paddingWidth) + 'px'
                }, 'fast', function () {
                    $(channelName + ' .sidebar').fadeIn('fast');
                });
            } else {
                $(channelName + ' .chat').animate({
                    'right': (parseInt($(channelName + ' .sidebar').css('width')) + privateMethods.sidebar.separatorWidth + (privateMethods.sidebar.paddingWidth * 2)) + 'px'
                }, 'fast', complete);
                $(channelName + ' .separator').animate({
                    'right': (parseInt($(channelName + ' .sidebar').css('width')) + privateMethods.sidebar.paddingWidth) + 'px'
                }, 'fast', function () {
                    $(channelName + ' .sidebar').fadeIn('fast');
                });
            }
        }
    };

    privateMethods.user = {
        formatGender: function (user) {
            return '<span class=\'gender ' + ((user.gender === 'M') ? 'male' : 'female') + '\'>' + privateMethods.user.getGenderLiteral(user.gender) + '</span>';
        },

        getGenderLiteral: function (gender) {
            return gender != 'N' ? gender === 'M' ? '♂' : '♀' : '';
        }
    };

    privateMethods.message = {
        formatSendTo: function (names) {
            var html = '→ (';
            for (var idx in names) html += "<button class='name" + (names[idx] === $.fn.sys().options.currentUser.name ? ' me' : '') + "'>" + names[idx] + ((idx == names.length - 1) ? '</button>' : '</button>, ');
            return html += ') ';
        }
    };

    privateMethods.channels = {
        resizing: false,
        padding: 10,
        space: 5,
        borders: 2,

        show: function (callback) {
            if (parseInt($('#channel-list').css('left')) >= 0) {
                if (typeof callback === 'function') callback();
                return;
            }

            var sidebarPos = $('#channels-content > section').filter(':visible').find('aside.sidebar').css('left');

            $('#channel-list').animate({
                'left': privateMethods.channels.padding + 'px'
            }, 'fast', callback);
            $('#channel-list-holder').animate({
                'left': (privateMethods.channels.padding + parseInt($('#channel-list').css('width')) + privateMethods.channels.borders + privateMethods.channels.space) + 'px'
            }, 'fast');
            $('#channels, #channels-content').animate({
                'left': (privateMethods.channels.padding + parseInt($('#channel-list').css('width')) + privateMethods.channels.borders * 2 + parseInt($('#channel-list-holder').css('width')) + privateMethods.channels.space * 2) + 'px'
            }, {
                duration: 'fast',
                step: function (now) {
                    if (sidebarPos != 'auto') $('aside.sidebar').css('left', (parseInt(sidebarPos) + privateMethods.channels.padding * 2 + privateMethods.channels.space * 2 - now) + 'px');
                },
                complete: function () {
                    var scrollable = $('#channels-content section .scrollableArea').filter(':visible');
                    scrollable.prop({ scrollTop: scrollable.prop('scrollHeight') });
                    privateMethods.tab.autoWidth();
                }
            });
        },
        hide: function (callback) {
            if (parseInt($('#channel-list').css('left')) < 0) {
                if (typeof callback === 'function') return callback();
                return;
            }

            var sidebarPos = $('#channels-content > section').filter(':visible').find('aside.sidebar').css('left');

            $('#channel-list').animate({ 'left': '-' + (parseInt($('#channel-list').css('width'))) + 'px' }, 'fast', callback);
            $('#channel-list-holder').animate({ 'left':'10px' });

            $('#channels, #channels-content').animate({
                'left': privateMethods.channels.padding + parseInt($('#channel-list-holder').css('width')) + privateMethods.channels.space + privateMethods.channels.borders * 2 + 'px'
            }, {
                duration: 'fast',
                step: function (now) {
                    if (sidebarPos != 'auto') $('aside.sidebar').css('left', (parseInt(sidebarPos) + privateMethods.channels.borders * 2 + privateMethods.channels.padding + privateMethods.channels.space * 2 + parseInt($('#channel-list-holder').css('width')) + parseInt($('#channel-list').css('width')) - now) + 'px');
                },
                complete: function() {
                    privateMethods.tab.autoWidth();
                }
            });
        }
    };

    privateMethods.channel = {
        qtips: {
            floatParams: {
                content: {
                    title: { button: true },
                    text: 'Загрузка...',
                    ajax: { type: 'POST', dataType: 'json' }
                },
                show: { ready: true, delay: 0, solo: true },
                hide: { fixed: true, leave: false, delay: 2000 },
                position: { my: 'top center', at: 'bottom center' },
                style: 'ui-tooltip-styling'
            },
            modalParams: {
                position: { my: 'center', at: 'center', target: $(window) },
                show: { solo: true, event: false, delay: 50 },
                hide: { event: false },
                style: 'ui-tooltip-styling'
            },
            init: function (channel) {
                privateMethods.channel.qtips.profile(channel);
                privateMethods.channel.qtips.info(channel);
                privateMethods.channel.qtips.tabArrow();
            },
            info: function (channel) {
                $('#channels li').on('mouseup', 'button#channel-' + channel, function (event) {
                    if (event.which != 3) return;
                    if ($.fn.sys().options.currentUser.id === '0' || $(this).data('private') || $.fn.sys().actions.popup) return;

                    $(this).removeData('qtip').qtip($.extend(true, {}, privateMethods.channel.qtips.floatParams, {
                        content: {
                            title: {
                                text: 'Информация о чате "' + $(this).find('span.name').text() + '"'
                            },
                            text: 'Загрузка...',
                            ajax: {
                                url: '/channel/' + encodeURIComponent(channel) + '/info',
                                success: function (data) {
                                    var content = '<ul class="channelinfo">';
                                    content += '<li><span class="param">Пользователи:</span> <span class="value">' + data.users + '</span></li>';
                                    content += '<li><span class="param">Сообщения:</span> <span class="value">' + data.messages + '</span></li>';
                                    content += '<li><span class="param">Дата создания:</span> <span class="value">' + $.fn.sys().time.date($.fn.sys().time.parse(data.date)) + '</span></li>';
                                    content += '</ul>';
                                    this.set('content.text', content);
                                }
                            }
                        },
                        position: { viewport: $(window) },
                        show: { event: false }
                    })).show();
                });
            },
            profile: function (channel) {
                $('#channel-' + channel + '-content').on('mouseup', 'div.message button:not(.me), .sidebar button.name:not(.me)', function (event) {
                    if (event.which != 3) return;
                    if ($.fn.sys().options.currentUser.id === '0' || $(this).text() === '$' || $.fn.sys().actions.popup) return;

                    $(this).removeData('qtip').qtip($.extend(true, {}, privateMethods.channel.qtips.floatParams, {
                        content: {
                            title: { text: 'Профиль ' + $(this).text() },
                            ajax: {
                                url: '/user/' + encodeURIComponent($(this).text()) + '/profile',
                                success: function (data, status) {
                                    var content = '<img src="' + (typeof data.pic == 'undefined' ? '/images/web/userpic1.png' : ('/userpics/' + data.pic)) + '" width="60" height="60" class="pic" />';
                                    content += '<ul class="profile clearfix">';
                                    content += '<li class="status"><span class="param">Статус:</span> <span class="value">' + $.fn.sys().status.toStringDisplay(data.status) + '</span></li>';
                                    content += '<li class="gender"><span class="param">Пол:</span> <span class="value">' + $.fn.sys().gender.toStringDisplay(data.gender) + '</span></li>';
                                    content += '<li class="messages"><span class="param">Сообщений:</span> <span class="value">' + data.messages + '</span></li>';
                                    content += '<li class="points"><span class="param">Баллы:</span> <span class="value">' + data.points + '</span></li>';
                                    content += '</ul><div class="actions clearfix">';
                                    content += '<button class="private' + (data.status === 'F' || data.isIgnore ? ' disabled' : '') + '" onclick="$.fn.sys().actions.private.request(\'' + data.name + '\', \'' + data.status + '\')">Приват</button>';
                                    content += '<button class="ignore ' + (data.isIgnore ? 'on' : 'off') + '" onclick="$.fn.sys().actions.ignore(\'' + data.name + '\', \'' + (data.isIgnore ? 'remove' : 'add') + '\')">' + (data.isIgnore ? 'Убрать игнор' : 'Игнор') + '</button>';
                                    content += '</div>';

                                    this.set('content.text', content);
                                }
                            }
                        },
                        position: { viewport: $('#channel-' + channel + '-content .scrollableArea') },
                        show: { event: false }
                    })).show();
                });
            },
            tabArrow: function () {
                $('#channels li.arrow')
                    .removeData('qtip')
                    .qtip({
                        content: 'Последние вкладки были скрыты, освободите место для их отображения',
                        position: { at: 'left center', my: 'center right' },
                        show: { event: 'click mouseenter' },
                        style: 'ui-tooltip-tipsy'
                    });
            }
        },
        type: {
            timeouts: []
        }
    };

    privateMethods.layers = {
        items: [],
        add: function(name, layer, showCallback, hideCallback) {
            if (privateMethods.layers.items[name]) return;
            privateMethods.layers.items[name] = { layer: layer, callbacks: { show: showCallback, hide: hideCallback} };
        },
        toogle: function(name, callback) {
            if (!privateMethods.layers.items[name]) return;
            if ($(privateMethods.layers.items[name].layer).is(':visible')) {
                privateMethods.layers.hide();
                $('#container').fadeTo('fast', 1);
                $('#message').focus();
            } else {
                privateMethods.layers.hide(function() {
                    privateMethods.layers.show(name, callback);
                })
            }
        },
        show: function(name, callback) {
            $('#container').fadeTo('fast', 0);
            $(privateMethods.layers.items[name].layer).fadeIn('fast', function() {
                if (typeof privateMethods.layers.items[name].callbacks.show == 'function') privateMethods.layers.items[name].callbacks.show();
                if (typeof callback == 'function') callback();
            });
        },
        register: function() {
            privateMethods.layers.add('account', 'section.account', null, null);
            privateMethods.layers.add('forgot', 'section.forgot', null, null);
            privateMethods.layers.add('help', 'section.help', function() {
                $('#bottom #help').addClass('pressed');
            }, function() {
                $('#bottom #help').removeClass('pressed');
            });
        }
    };

    // Public methods

    UInterface.prototype.tab = {
        add: function (channelName, channelId, params, callback) {
            if ($('#channel-' + channelId).length != 0) return;

            $('#channels li').not('.arrow').removeClass('current');
            $('#channels-content section').hide();

            $("#channels li.arrow").before(
                "<li class='current'>" +
                    "<button class='channel' id='channel-" + channelId + "'>" +
                        "<span class='name'>" + channelName + "</span>" +
                    "</button>" +
                    ($('#channels li').not('.arrow').size() > 0 ? "<button class='remove'>x</button>" : '') +
                "</li>");

            $('#channels-content').append(
                "<section id='channel-" + channelId + "-content' class='use-sidebar'>" +
                    "<div class='chat'>" +
                        "<button class='scrollingHotSpotUp'>˄ ˄ ˄</button>" +
                        "<div class='scrollableArea'>" +
                            "<div class='notifications'>" +
                                "<ul class='type'><span>Печатает:</span></ul>" +
                            "</div>" +
                        "</div>" +
                        "<button class='scrollingHotSpotDown'>˅ ˅ ˅</button>" +
                    "</div>" +
                    "<a class='separator'></a>" +
                    "<aside class='sidebar'>" +
                        "<header>Пользователи (<span>0</span>)</header>" +
                        "<button class='scrollingHotSpotUp'>˄ ˄ ˄</button>" +
                        "<ul class='user-list'></ul>" +
                        "<button class='scrollingHotSpotDown'>˅ ˅ ˅</button>" +
                        "<div class='filterBox'>" +
                            "<input type='text' name='userFilter' placeholder='поиск' class='filter' />" +
                        "</div>" +
                    "</aside>" +
                    "<ul class='sendto'><span>→</span></ul>" +
                "</section>");

            $('#channels li button#channel-' + channelId).data('private', params['private']);

            $().scroller({
                scrollableArea: $('#channel-' + channelId + '-content .scrollableArea'),
                spotUp: $('#channel-' + channelId + '-content .chat .scrollingHotSpotUp'),
                spotDown: $('#channel-' + channelId + '-content .chat .scrollingHotSpotDown'),
                mouseArea: $('#channel-' + channelId + '-content .chat')
            });

            $().scroller({
                scrollableArea: $('#channel-' + channelId + '-content .sidebar ul'),
                spotUp: $('#channel-' + channelId + '-content .sidebar .scrollingHotSpotUp'),
                spotDown: $('#channel-' + channelId + '-content .sidebar .scrollingHotSpotDown'),
                mouseArea: $('#channel-' + channelId + '-content .sidebar')
            });

            $('#channel-' + channelId + '-content .sidebar input.filter').val('');

            $('#channel-' + channelId + '-content .sidebar input.filter').change(function () {
                var filter = $(this).val().toLowerCase();
                if (filter) {
                    $('#channel-' + channelId + '-content .sidebar ul button.name').filter(function () {
                        return $(this).text().toLowerCase().indexOf(filter) < 0
                    }).parent().slideUp('fast');
                    $('#channel-' + channelId + '-content .sidebar ul button.name').filter(function () {
                        return $(this).text().toLowerCase().indexOf(filter) >= 0
                    }).parent().slideDown('fast');
                } else {
                    $('#channel-' + channelId + '-content .sidebar li').filter(':hidden').slideDown('fast');
                }

                return false;
            }).keyup(function () {
                $(this).change()
            });

            // Send to
            $('#channel-' + channelId + '-content').on('click', 'div.message button:not(.me), .sidebar button.name:not(.me)', function () {
                if ($.fn.sys().options.currentUser.id === '0' || $(this).text() === '$') return false;

                var name = $(this).text();
                var filter = function () { return name === $(this).text() };
                var namesCount = $('#channel-' + channelId + '-content .sendto li').length;

                if ($('#channel-' + channelId + '-content .sendto button.name').filter(filter).length > 0) return false;

                if (namesCount === 3) {
                    return $.jGrowl('Вы можете обращаться не более чем к 3 пользователям', { header: 'Ошибка' });
                }

                var html = (namesCount > 0 ? "<li style='display: none'>" : "<li>");
                html += "<button class='name'>" + name + "</button>";
                html += "<button class='close'>x</button>";
                html += "</li>";

                $('#channel-' + channelId + '-content .sendto').append(html);

                if (namesCount === 0) {
                    $('#channel-' + channelId + '-content .sendto').show('slide', { direction: 'left' }, 'fast');
                } else {
                    $('#channel-' + channelId + '-content .sendto li:last-child').show('drop', { direction: 'left' }, 'fast');
                }

                try {
                    yaCounter6276298.hit('/message/to', null, null, {
                        user: $.fn.sys().options.currentUser.name,
                        to: name
                    });
                } catch (e) {}

                return false;
            });

            $('#channel-' + channelId + '-content .sendto').on('click', 'button.close', function () {
                $(this).parent().hide('drop', { direction: 'left' }, 'fast', function () {
                    $(this).remove();
                    var channel = $('#channel-' + channelId + '-content');
                    if (channel.find('.sendto li').length === 0) {
                        if (channel.is(':visible')) {
                            channel.find('.sendto').fadeOut('fast');
                        } else {
                            channel.find('.sendto').css('display', 'none');
                        }
                    }
                });
            });

            privateMethods.channel.qtips.init(channelId);

            if (!privateMethods.tab.checkWidth().isOut) {
                $('#channels li.current').show('puff', { direction: 'right' }, 'fast', function() {
                    $('#channel-' + channelId + '-content').show('fast', function () {
                        $(document).prop('title', $(document).prop('title').replace(/(?:\/\/\s).+$/, '// ' + channelName));
                        if (typeof callback == 'function') callback();
                    });
                });
            } else {
                privateMethods.tab.updateArrow();
                if (typeof callback == 'function') callback();
            }
        },

        unreadCounter: function (button) {
            if ($(button).find('span.count').length > 0) {
                var titleCounter = $(document).prop('title').match(/(?!\()\d+/);
                var tabCounter = $(button).find('span.count').text().match(/(?!\()\d+(?!\()/);

                if (tabCounter != null) {
                    try {
                        tabCounter = parseInt(tabCounter[0]);
                    } catch (e) {
                        return;
                    }
                    if (titleCounter != null) {
                        try {
                            titleCounter = parseInt(titleCounter[0]);
                        } catch (e) {
                            return;
                        }
                        if (titleCounter - tabCounter <= 0) {
                            $(document).prop('title', $(document).prop('title').replace(/^\(\d+\)\s/, ''));
                        } else {
                            $(document).prop('title', $(document).prop('title').replace(/(?!\()\d+/, titleCounter - tabCounter));
                        }
                    }

                    $(button).find('span.count').remove();
                }
            }
        },

        height: function (channelId) {
            $('#channel-' + channelId + '-content .scrollableArea').css('height', ($('.chat:last').height() - parseInt($('scrollableArea').css('padding-bottom'))) + 'px');
        },

        flash: function (channelId, color) {
            for (var i = 0; i <= 120; i++) {
                $('button#channel-' + channelId)
                    .effect('highlight', { color: color }, 500).next()
                    .effect('highlight', { color: color }, 500);
            }
        }
    };

    UInterface.prototype.sidebar = {
        init: function (channelName, params) {
            privateMethods.sidebar.resizing = true;

            $(channelName + ' .separator').on('click', function (e) {
                e.preventDefault();
                if ($(channelName).hasClass('use-sidebar')) {
                    privateMethods.sidebar.hide(channelName, !params['private']);
                } else {
                    privateMethods.sidebar.show(channelName, !params['private']);
                }
            });

            if ($.jStorage.get(channelName + '-sidebar-size') != null) {
                $(channelName + ' .sidebar').css('width', $.jStorage.get(channelName + '-sidebar-size'));
            }

            $(channelName + ' .sidebar').resizable({
                handles: 'w',
                minWidth: 150,
                maxWidth: 400,
                resize: function (event, ui) {
                    $(channelName + ' .separator').css('right', ui.size.width + privateMethods.sidebar.paddingWidth + 'px');
                    $(channelName + ' .chat').css('right', ui.size.width + privateMethods.sidebar.separatorWidth + (privateMethods.sidebar.paddingWidth * 2) + 'px');
                    privateMethods.sidebar.resizing = true;
                },
                stop: function () {
                    $(channelName + ' .separator').css('right', $(this).width() + privateMethods.sidebar.paddingWidth + 'px');
                    $(channelName + ' .chat').css('right', $(this).width() + privateMethods.sidebar.separatorWidth + (privateMethods.sidebar.paddingWidth * 2) + 'px');

                    if (!params['private']) {
                        $.jStorage.set(channelName + '-sidebar-size', $(channelName + ' .sidebar').css('width'));
                    }

                    var scrollable = $(this).parent().find('.scrollableArea');
                    scrollable.prop({ scrollTop: scrollable.prop('scrollHeight') });
                    scrollable = $(this).find('ul');
                    scrollable.prop({ scrollTop: scrollable.prop('scrollHeight') });
                    privateMethods.sidebar.resizing = false;
                }
            });

            if ($.jStorage.get(channelName + '-sidebar-show') === null) {
                $(channelName).addClass('use-sidebar');
                privateMethods.sidebar.show(channelName, false);
            } else if (!params['private']) {
                if (!$.jStorage.get(channelName + '-sidebar-show')) {
                    $(channelName).removeClass('use-sidebar');
                    privateMethods.sidebar.hide(channelName, true);
                } else {
                    $(channelName).addClass('use-sidebar');
                    privateMethods.sidebar.show(channelName, true);
                }
            }
        }
    };

    UInterface.prototype.login = {
        hide: function () {
            $('#login').hide('slide', { direction: 'up' }, 'fast', function () {
                $('#top').append(
                    "<div id='user' style='display: none'>" +
                        "Добро пожаловать " +
                        "<div class='status closed'>" +
                            "<span class='name'>" + $.fn.sys().options.currentUser.name + "</span>" +
                            "<span class='icon online'> </span>" +
                            "<button class='switch'>►</button>" +
                            "<div class='statuses'>" +
                                "<button id='online'>" +
                                    "<span class='icon'> </span>" +
                                    "<span class='status'>На месте</span>" +
                                "</button>" +
                                "<button id='away'>" +
                                    "<span class='icon'> </span>" +
                                    "<span class='status'>Отошел</span>" +
                                "</button>" +
                                "<button id='unavailable'>" +
                                    "<span class='icon'> </span>" +
                                    "<span class='status'>Недоступен</span>" +
                                "</button>" +
                            "</div>" +
                        "</div> / " +
                        "<button id='account'>Аккаунт</button> / " +
                        "<button id='logout'>Выйти</button>" +
                    "</div>");

                $('#top #user').show('slide', { direction: 'down' }, 'fast');
            });
        }
    };

    UInterface.prototype.user = {
        connect: function (channelId, user) {
            if ($('#channel-' + channelId + '-content .sidebar li button').filter( function () { return $(this).text() === user.name }).length === 0) {
                $('#channel-' + channelId + '-content .sidebar ul').append(privateMethods.user.format(user));
                $('#channel-' + channelId + '-content .sidebar header span').text(parseInt($('#channel-' + channelId + '-content .sidebar header span').text()) + 1);
                if ($.fn.sys().options.currentUser.id != '0' && $.fn.sys().options.currentUser.ignore.indexOf(user.name) > -1) return;
                $('#channel-' + channelId + '-content .sidebar li:last-child').effect('pulsate', { times: 2 }, 1000, function() {
                    $.fn.sys().channel.notify(channelId, user, 'В комнату вошел пользователь <button class="name">' + user.name + '</button>');
                });
            }
        },

        disconnect: function (channelId, user) {
            $('#channel-' + channelId + '-content .sidebar li button').filter(function () { return $(this).text() === user.name }).fadeOut('slow', function () {
                $(this).parent().remove();
                $('#channel-' + channelId + '-content .sidebar header span').text(parseInt($('#channel-' + channelId + '-content .sidebar header span').text()) - 1);
            });

            $('#channel-' + channelId + '-content .sendto li button.name').filter(function () { return $(this).text() === user.name }).next().trigger('click');

            if ($('div.qtip').filter(':visible').find('button.yes').data('name') === user.name) {
                $(window).qtip('api').hide();

                $.fn.sys().actions.popup = false;
                $.fn.sys().actions['private'].queue.shift();

                if ($.fn.sys().actions['private'].queue.length > 0) {
                    privateMethods.channel.qtips['private']($.fn.sys().actions['private'].queue[0]);
                    $(window).qtip('api').show();
                }
            }

            $.fn.sys().channel.notify(channelId, user, 'Пользователь <button class="name">' + user.name + '</button> вышел из комнаты');
        },

        updateGender: function (channelId, user) {
            var li = $('#channel-' + channelId + '-content .sidebar li button').filter(function () { return $(this).text() === user.name }).parent();
            var span = li.find('span.gender');

            if (span.length > 0) {
                if (user.gender != 'N') {
                    if (span.text() === privateMethods.user.getGenderLiteral(user.gender)) return;
                    span.text(privateMethods.user.getGenderLiteral(user.gender));
                    if (user.gender === 'M') {
                        span.removeClass('female').addClass('male');
                    } else if (user.gender === 'W') {
                        span.removeClass('male').addClass('female');
                    }
                } else {
                    span.remove();
                }
            } else if (user.gender != 'N') {
                li.append(privateMethods.user.formatGender(user));
            }

            if ($.fn.sys().options.currentUser.id != '0') {
                if (user.name === $.fn.sys().options.currentUser.name) {
                    $.fn.sys().options.updateUser($.extend({}, $.fn.sys().options.currentUser, { gender: user.gender }));
                }
            }

            $.fn.sys().channel.notify(channelId, user, 'Пользователь <button class="name">' + user.name + '</button> сменил пол');
        },

        updateStatus: function (channelId, user) {
            var li = $('#channel-' + channelId + '-content .sidebar li button').filter(function () { return $(this).text() == user.name }).parent();

            var status = li.find('span.status');

            if (user.status === 'O' && status.hasClass('online'))      return;
            if (user.status === 'F' && status.hasClass('offline'))     return;
            if (user.status === 'A' && status.hasClass('away'))        return;
            if (user.status === 'N' && status.hasClass('unavailable')) return;

            if ($.fn.sys().options.currentUser.id != '0') {
                if (user.name === $.fn.sys().options.currentUser.name) {
                    $('#user div.status > .icon')
                        .removeClass($.fn.sys().status.toString($.fn.sys().options.currentUser.status))
                        .addClass($.fn.sys().status.toString(user.status));
                    $.fn.sys().options.updateUser($.extend({}, $.fn.sys().options.currentUser, { status: user.status }));
                }
            }

            status.removeClass('offline online away unavailable')
                  .addClass(user.status === 'F' ? 'online' : $.fn.sys().status.toString(user.status))
                  .text(user.status);

            $.fn.sys().channel.notify(channelId, user, 'Пользователь <button class="name">' + user.name + '</button> сменил статус');
        },
        format: function (user) {
            return '<li' + ($.fn.sys().options.currentUser.id != '0' && $.fn.sys().options.currentUser.ignore.indexOf(user.name) > -1 ? ' class="ignore"' : '') + '>' +
                        '<span class="status ' + (user.status === 'F' ? 'online' : $.fn.sys().status.toString(user.status)) + '"> </span>' +
                        '<button class=\'name' + ((user.name === $.fn.sys().options.currentUser.name) ? ' me' : '') + '\'>' + user.name + '</button>' +
                        ((user.gender != 'N') ? privateMethods.user.formatGender(user) : '') +
                    '</li>';
        },
        highlightMe: function () {
            $('.message button.name, .sidebar button.name').filter(function () { return this.innerHTML === $.fn.sys().options.currentUser.name }).addClass('me');
        },
        filterIgnore: function () {
            $('.message button.name, .sidebar button.name').filter( function () {
                return $.fn.sys().options.currentUser.ignore.indexOf(this.innerHTML) > -1
            }).parent().addClass('ignore');

            $('.message button.name, .sidebar button.name').filter(function () {
                return $.fn.sys().options.currentUser.ignore.indexOf(this.innerHTML) === -1
            }).parent().removeClass('ignore');

            var scrollable = $('#channels-content section .scrollableArea').filter(':visible');
            scrollable.prop({ scrollTop: scrollable.prop('scrollHeight') });
        }
    };

    UInterface.prototype.message = {
        format: function (message) {
            return "<div class='message cleafix'>" +
                       "<time>[" + $.fn.sys().time.format($.fn.sys().time.parse(message.time)) + ']</time>' +
                       '<button class="name' + (message.name === $.fn.sys().options.currentUser.name ? ' me' : '') + '">' + message.name + '</button>:' +
                       '<p>' + ((message.to && message.to.length > 0) ? privateMethods.message.formatSendTo(message.to) : '') + $().emoticon(message.text) + '</p>' +
                   '</div>';
        }
    };

    UInterface.prototype.channels = {
        init: function () {
            if ($.jStorage.get('channel-list.size') != null) {
                var diff = $('#channel-list').width() - parseInt($.jStorage.get('channel-list.size'));
                $('#channel-list').css('left', parseInt($('#channel-list').css('left')) + diff);
                $('#channel-list').css('width', $.jStorage.get('channel-list.size'));
            }

            $('#channel-list').resizable({
                handles: 'e',
                minWidth: 150,
                maxWidth: 300,
                resize: function (event, ui) {
                    $('#channels, #channels-content').css('left', ui.size.width + privateMethods.channels.padding + privateMethods.channels.borders * 2 + privateMethods.channels.space * 2 + parseInt($('#channel-list-holder').css('width')) + 'px');
                    $('#channel-list-holder').css('left', ui.size.width + privateMethods.channels.padding + privateMethods.channels.borders + privateMethods.channels.space + 'px');

                    var sidebar = $('aside.sidebar').filter(':visible');
                    if (sidebar.css('left') != 'auto') {
                        sidebar.css('left', (sidebar.parent().find('.chat').width() + 17) + 'px');
                    }

                    privateMethods.channels.resizing = true;
                },
                stop: function () {
                    $('#channels, #channels-content').css('left', $(this).width() + privateMethods.channels.padding + privateMethods.channels.borders * 2 + privateMethods.channels.space * 2 + parseInt($('#channel-list-holder').css('width')) + 'px');
                    $('#channel-list-holder').css('left', $(this).width() + privateMethods.channels.padding + privateMethods.channels.borders + privateMethods.channels.space + 'px');

                    var sidebar = $('aside.sidebar').filter(':visible');
                    if (sidebar.css('left') != 'auto') {
                        sidebar.css('left', (sidebar.parent().find('.chat').width() + 17) + 'px');
                    }

                    $.jStorage.set('channel-list.size', $('#channel-list').css('width'));

                    var scrollable = $('#channels-content section .scrollableArea').filter(':visible');
                    scrollable.prop({ scrollTop: scrollable.prop('scrollHeight') });

                    privateMethods.channels.resizing = false;
                }
            });

            $('body').on('click', '#channel-list-holder', function () {
                privateMethods.channels.showChannelList(true);
            });

            $().scroller({
                scrollableArea: $('#channel-list menu'),
                spotUp: $('#channel-list .scrollingHotSpotUp'),
                spotDown: $('#channel-list .scrollingHotSpotDown'),
                mouseArea: $('#channel-list')
            });

            $('#channel-list input.filter').val('');

            $('#channel-list input.filter').change(function () {
                var filter = $(this).val().toLowerCase();
                if (filter) {
                    $('#channel-list menu span.name').filter(function () { return $(this).text().toLowerCase().indexOf(filter) < 0 }).parent().parent().slideUp('fast');
                    $('#channel-list menu span.name').filter(function () { return $(this).text().toLowerCase().indexOf(filter) >= 0 }).parent().parent().slideDown('fast');
                } else {
                    $('#channel-list menu li').filter(':hidden').slideDown('fast');
                }

                return false;
            }).keyup(function () {
                $(this).change();
            });
        },
        showChannelList: function (remember) {
            if (parseInt($('#channel-list').css('left')) < 0 || !$('#channel-list').is(':visible')) {
                privateMethods.channels.show(function () {
                    $('#channel-list menu').prop({ scrollTop: 0 });
                    if (remember) $.jStorage.set('channel-list', true);
                });
            } else {
                privateMethods.channels.hide(null);
                if (remember) $.jStorage.set('channel-list', false);
            }
        }
    };

    UInterface.prototype.channel = {
        type: {
            update: function(name, channelId) {
                var filter = function () { return name === $(this).text() };
                var namesCount = $('#channel-' + channelId + '-content .type li').length;

                if (!privateMethods.channel.type.timeouts[channelId]) {
                    privateMethods.channel.type.timeouts[channelId] = [];
                }

                if (privateMethods.channel.type.timeouts[channelId][name]) {
                    clearTimeout(privateMethods.channel.type.timeouts[channelId][name]);
                }

                privateMethods.channel.type.timeouts[channelId][name] = setTimeout(function() {
                    $('#channel-' + channelId + '-content .type li').filter(filter).hide('drop', { direction: 'left' }, 'fast', function () {
                        $(this).remove();
                        if ($('#channel-' + channelId + '-content .type li').length === 0) {
                            $('#channel-' + channelId + '-content .type').fadeOut('fast', function() {
                                $('#channel-' + channelId + '-content .scrollableArea').prop({
                                    scrollTop: $('#channel-' + channelId + '-content .scrollableArea').prop('scrollHeight')
                                });
                            });
                        }
                    });
                }, 1500);

                if ($('#channel-' + channelId + '-content .type li').filter(filter).length > 0) return false;

                if (namesCount >= 2) return false;

                var html = (namesCount > 0 ? "<li style='display: none'>" : "<li>") + name + "</li>";
                $('#channel-' + channelId + '-content .type').append(html);

                if (namesCount === 0) {
                    $('#channel-' + channelId + '-content .type').show('slide', { direction: 'left' }, 'fast', function() {
                        $('#channel-' + channelId + '-content .scrollableArea').prop({
                            scrollTop: $('#channel-' + channelId + '-content .scrollableArea').prop('scrollHeight')
                        });
                    });
                } else {
                    $('#channel-' + channelId + '-content .type li:last-child').show('drop', { direction: 'left' }, 'fast', function() {
                        $('#channel-' + channelId + '-content .scrollableArea').prop({
                            scrollTop: $('#channel-' + channelId + '-content .scrollableArea').prop('scrollHeight')
                        });
                    });
                }
            }
        },
        qtips: {
            'private': function (name) {
                var html = 'Пользователь "' + name + '" хочет пригласить вас в приват, вы согласны?';
                html += '<div class="actions yesno clearfix">' +
                            '<button class="yes" data-name="' + name + '" onclick="$.fn.sys().actions.private.yes(\'' + name + '\')">Да</button>' +
                            '<button class="no" data-name="' + name + '" onclick="$.fn.sys().actions.private.no(\'' + name + '\')">Нет</button>' +
                        '</div>';
                $(window).qtip($.extend(true, {}, privateMethods.channel.qtips.modalParams, {
                    id: 'privateModal',
                    content: {
                        text: html,
                        title: { text: 'Приглашение в приват [' + $.fn.sys().time.format(new Date()) + ']' }
                    }
                }));
            }
        },
        format: function (channel) {
            return '<li>' +
                        '<button data-id="' + channel.id + '" data-url="' + channel.url + '">' +
                        '<span class="name">' + channel.name + '</span> (<span class="count">' + channel.count + '</span>)' +
                        '</button>' +
                   '</li>';
        }
    };

    UInterface.prototype.layers = {
        hide: function(callback) {
            if ($('#container').css('opacity') === '1') {
                if (typeof callback == 'function') callback();
                return;
            }
            for (var key in privateMethods.layers.items) {
                var item = privateMethods.layers.items[key];
                if (!$(item.layer).is(':visible')) continue;
                $(item.layer).fadeOut('fast', function() {
                    if (typeof item.callbacks.hide == 'function') item.callbacks.hide();
                    if (typeof callback == 'function') callback();
                });
            }
        }
    };

    privateMethods.init = function(ufc) {
        $.extend(true, privateMethods, ufc);

        privateMethods.mainEvents();
        privateMethods.layers.register();
        privateMethods.userpic.init();
        privateMethods.account();
        privateMethods.smiles();
        privateMethods.statuses();
    };

    $.fn.ufc = function() {
        return instance ? instance : instance = new UInterface();
    };
})(jQuery, window, document, GibberishAES);