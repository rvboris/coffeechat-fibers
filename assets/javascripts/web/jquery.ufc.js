(function($, window, document, aes, mote) {
    'use strict';

    var privateMethods = {};
    var instance;

    function UInterface(options) {
        this.options = options;
        return privateMethods.init(this);
    }

    // Private methods

    privateMethods.mainEvents = function() {
        $('#channels').on('click', 'button.channel', privateMethods.tab.activate);
        $('#channels').on('click', 'button.remove', privateMethods.tab.remove);

        $('#loading').fadeOut('fast', function() {
            $('#channels').fadeIn();
            $('#channels-content').fadeIn();
        });

        var srcWindowHeight = $('html').height();
        var srcPanelsHeight = $('#channel-list').height();
        var srcSidebarHeight = $('#channel-list').height();

        $(window).resize(function(event) {
            if (event.target !== window) return;

            var scrollable = $('#channels-content section .scrollableArea').filter(':visible');
            var visibleChannelName = scrollable.parent().parent().attr('id');

            var minChatWidth = 310;
            var footerHeight = 53;

            $('.scrollableArea').css('height', ($('.chat:last').height() - parseInt($('scrollableArea').css('padding-bottom'))) + 'px');

            if ($('#channel-list').css('height') !== 'auto')
                $('#channel-list').css('height', (srcPanelsHeight + $('html').height() - srcWindowHeight) + 'px');

            if ($('aside.sidebar').css('height') !== 'auto')
                $('aside.sidebar').css('height', (srcSidebarHeight - footerHeight + $('html').height() - srcWindowHeight) + 'px');

            privateMethods.sidebar.autoPosition();

            if (privateMethods.sidebar.resizing || privateMethods.channels.resizing) return;

            privateMethods.tab.autoWidth();

            if (scrollable.parent().innerWidth() <= minChatWidth && ($.jStorage.get('#' + visibleChannelName + '-sidebar-show') === null || $.jStorage.get('#' + visibleChannelName + '-sidebar-show') === false)) {
                privateMethods.sidebar.hide('#' + visibleChannelName, false, function() {
                    if (scrollable.parent().innerWidth() <= minChatWidth && ($.jStorage.get('channel-list') === null | $.jStorage.get('channel-list') === false)) {
                        privateMethods.channels.hide();
                    }
                });
            } else if (scrollable.parent().innerWidth() - $('#' + visibleChannelName).find('aside.sidebar').innerWidth() - privateMethods.sidebar.separatorWidth > minChatWidth && ($.jStorage.get('#' + visibleChannelName + '-sidebar-show') === null || $.jStorage.get('#' + visibleChannelName + '-sidebar-show') === true)) {
                privateMethods.sidebar.show('#' + visibleChannelName, false, function() {
                    if (scrollable.parent().innerWidth() - $('#channel-list').outerWidth() + privateMethods.sidebar.separatorWidth + 10 /* padding */ > minChatWidth && ($.jStorage.get('channel-list') === null || $.jStorage.get('channel-list') === true)) {
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
        init: function() {
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
        onUploadStart: function() {
            $('#userpic').uploadifySettings('buttonText', 'Загрузка...');
        },
        onUploadSuccess: function(file, data, response) {
            if (response) {
                data = JSON.parse(data);
                if (data.error) {
                    $.fn.notifier(data.error);
                    $('#userpic').uploadifySettings('buttonText', 'Загрузить');
                } else {
                    $('img.userpic').attr('src', '/userpics/' + data.pic);
                    $.fn.sys().options.currentUser.pic = data.pic;
                    $('#userpic').uploadifySettings('buttonText', 'Загружено');
                    setTimeout(function() {
                        $('#userpic').uploadifySettings('buttonText', 'Загрузить');
                    }, 3000);
                }
            }
        },
        onUploadError: function() {
            $.fn.notifier('Неизвестная ошибка');
            return false;
        },
        onSelect: function() {
            $('#userpic').uploadifySettings('uploader', '/user/' + encodeURIComponent(aes.enc($.fn.sys().options.currentUser.id, $.fn.sys().options.serverKey)) + '/pic');
        },
        onSelectError: function(file, errorCode) {
            switch (errorCode) {
                case SWFUpload.QUEUE_ERROR.FILE_EXCEEDS_SIZE_LIMIT:
                    $.fn.notifier('Размер файла не должен превышать 10КБ (60х60)');
                    break;
                case SWFUpload.QUEUE_ERROR.ZERO_BYTE_FILE:
                    $.fn.notifier('Файл пуст');
                    break;
                case SWFUpload.QUEUE_ERROR.INVALID_FILETYPE:
                    $.fn.notifier('Недопустимый формат файла');
                    break;
                default:
                    $.fn.notifier('Неизвестная ошибка');
            }
            return false;
        }
    };

    privateMethods.account = function() {
        $('#top').on('click', '#user #account', function() {
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

            if ($.fn.sys().options.currentUser.gender !== 'N') {
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

        $('section.account span.male').on('click', function() {
            if (!$('section.account input[value="1"]').prop('checked')) {
                $('section.account span.female').removeClass('checked');
                $(this).addClass('checked');
                $('section.account input[value="2"]').prop('checked', false);
                $('section.account input[value="1"]').prop('checked', true);
            } else {
                $(this).removeClass('checked');
                $('section.account input[value="1"]').prop('checked', false);
            }
        });

        $('section.account span.female').on('click', function() {
            if (!$('section.account input[value="2"]').prop('checked')) {
                $('section.account span.male').removeClass('checked');
                $(this).addClass('checked');
                $('section.account input[value="1"]').prop('checked', false);
                $('section.account input[value="2"]').prop('checked', true);
            } else {
                $(this).removeClass('checked');
                $('section.account input[value="2"]').prop('checked', false);
            }
        });

        $('section.account form.audio-settings span.switch, section.account form.interface-settings span.switch').on('click', function() {
            if ($(this).prev().prop('checked')) {
                $(this).removeClass('checked').html('off');
                $(this).prev().prop('checked', false);
            } else {
                $(this).addClass('checked').html('on');
                $(this).prev().prop('checked', true);
            }
        });

        $('section.account button.cancel').on('click', function() {
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

        $('section.account form.account').submit(function() {
            $('section.account').block(accountOverlay);

            $.post('/user/account', $('section.account form.account input').serialize()).success(function(data) {
                if (data.error) return $.fn.notifier(data.error);

                $.fn.notifier('Сохранение завершено');

                privateMethods.layers.toogle('account');
            }).error(function() {
                $.fn.notifier('Не удалось сохранить данные аккаунта');
            }).complete(function() {
                $('section.account').unblock();
            });

            return false;
        });

        $('section.account form.audio-settings, section.account form.interface-settings').submit(function() {
            $('section.account').block(accountOverlay);

            if ($(this).hasClass('audio-settings')) {
                var settings = $('section.account form.audio-settings input[type=checkbox]').serializeObject();
                settings.section = 'audio';
            } else if ($(this).hasClass('interface-settings')) {
                settings = $('section.account form.interface-settings input[type=checkbox]').serializeObject();
                settings.section = 'interface';
            }

            settings._csrf = privateMethods.options.csrf;

            $.post('/user/settings', settings).success(function(data) {
                if (data.error) return $.fn.notifier(data.error);

                $.fn.notifier('Сохранение завершено');
                $.fn.sys().options.updateUser($.extend({}, $.fn.sys().options.currentUser, { settings: data }));

                privateMethods.layers.toogle('account');
            }).error(function() {
                $.fn.notifier('Не удалось сохранить настройки');
            }).complete(function() {
                $('section.account').unblock();
            });

            return false;
        });

        $('#top #login #forgot, section.forgot button.cancel').on('click', function() {
            privateMethods.layers.toogle('forgot', null);
            return false;
        });

        $('section.forgot form.forgot').submit(function() {
            $('section.forgot').block($.extend(true, {}, accountOverlay, { message: 'Отправка...' }));

            $.post('/user/forgot', $('section.forgot form.forgot input').serialize()).success(function(data) {
                if (data.error) return $.fn.notifier(data.error);

                $.fn.notifier('На ваш email отправлены сведения для восстановления пароля');

                privateMethods.layers.toogle('forgot');
            }).error(function() {
                $.fn.notifier('Не удалось отправить данные для восстановления пароля');
            }).complete(function() {
                $('section.forgot').unblock();
            });

            return false;
        });
    };

    privateMethods.smiles = function() {
        $('#channels-content div#smiles img').on('click', function() {
            $('#message').val($('#message').val() + ' [:' + $(this).attr('src').split(/\./)[0].split('/')[3] + ':] ').focus();
            $('#bottom button#smile').trigger('click');
        }).jail({ event: 'mouseover', selector: '#bottom button#smile' });

        $('#bottom button#smile').on('click', function() {
            if ($('#container').css('opacity') === '0') return;

            if ($('#channels-content div#smiles').is(':visible')) {
                $('#channels-content div#smiles').hide('slide', { direction: 'down' }, 'fast', function() {
                    $('#bottom button#smile').removeClass('pressed');
                });
            } else {
                $('#channels-content div#smiles').show('slide', { direction: 'down' }, 'fast', function() {
                    $('#bottom button#smile').addClass('pressed');
                });
            }
            return false;
        });
    };

    privateMethods.statuses = function() {
        $('#top').on('click', '#user button.switch', function() {
            var parent = $(this).parent();
            if (parent.hasClass('closed')) {
                $('#user div.statuses').fadeIn('fast', function() {
                    parent.removeClass('closed');
                    parent.addClass('opened');
                });
                $(this).text('◄');
            } else if (parent.hasClass('opened')) {
                $('#user div.statuses').fadeOut('fast', function() {
                    parent.removeClass('opened');
                    parent.addClass('closed');
                });
                $(this).text('►');
            }
            return false;
        });

        $('body').on('click', '#user div.statuses button', function() {
            $.fn.sys().status.change($(this).attr('id'));
            $.fn.sys().options.updateUser($.extend({}, $.fn.sys().options.currentUser, { overrideStatus: $(this).attr('id') !== 'online' }));
            $('#user button.switch').trigger('click');
        });
    };

    privateMethods.tab = {
        switching: false,
        remove: function() {
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



        activate: function() {
            var tabContent = $('#' + $(this).attr('id') + '-content');
            var scrollable = tabContent.find('.scrollableArea');
            var button = this;
            var minChatWidth = 310;

            if (tabContent.filter(':visible').size() > 0) return;

            privateMethods.tab.switching = true;

            if ($(button).data('private') === true) {
                tabContent.find('.scrollableArea .notifications .type').hide();
            }

            $('#channels-content section').fadeOut('fast');

            tabContent.fadeIn('fast', function() {
                $('aside.sidebar').each(function(idx, sidebar) {
                    sidebar = $(sidebar);
                    if (sidebar.css('left') !== 'auto') {
                        if (sidebar.is(':visible') === true) {
                            sidebar.css('left', (sidebar.parent().find('.chat').width() + privateMethods.sidebar.separatorWidth) + 'px');
                            sidebar.css('opacity', '1');
                        } else {
                            sidebar.css('opacity', '0');
                            sidebar.css('left', (sidebar.parent().find('.chat').width() + privateMethods.sidebar.separatorWidth - sidebar.width()) + 'px');
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

            $(button).prev().stop(true, true);
            $(button).stop(true, true);
            $(button).next().stop(true, true);
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
        separatorWidth: 30,

        autoPosition: function() {
            $('aside.sidebar').each(function(idx, sidebar) {
                sidebar = $(sidebar);
                if (sidebar.css('left') !== 'auto') {
                    if (sidebar.is(':visible') === true) {
                        sidebar.css('left', (sidebar.parent().find('.chat').width() + privateMethods.sidebar.separatorWidth) + 'px');
                        sidebar.css('opacity', '1');
                    } else {
                        sidebar.css('opacity', '0');
                        sidebar.css('left', (sidebar.parent().find('.chat').width() + privateMethods.sidebar.separatorWidth - sidebar.width()) + 'px');
                    }
                }
            });
        },

        hide: function(channelName, remember, callback) {
            if (typeof remember == 'undefined') remember = true;

            $(channelName + ' .sidebar').fadeOut('fast', function() {
                $(channelName + ' .chat').animate({
                    'right': privateMethods.sidebar.separatorWidth + 'px'
                }, 'fast', function() {
                    $(channelName).removeClass('use-sidebar');
                    if (remember) $.jStorage.set(channelName + '-sidebar-show', false);
                    if (typeof callback === 'function') callback();
                });
                $(channelName + ' .separator').animate({ 'right': '1px' }, 'fast');
            });
        },

        show: function(channelName, remember, callback) {
            if (typeof remember == 'undefined') remember = true;

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

            $(channelName + ' .sidebar').css('opacity', 1);

            if ($.jStorage.get(channelName + '-sidebar-size') !== null) {
                $(channelName + ' .chat').animate({
                    'right': (parseInt($.jStorage.get(channelName + '-sidebar-size')) + privateMethods.sidebar.separatorWidth) + 'px'
                }, 'fast', complete);
                $(channelName + ' .separator').animate({
                    'right': (parseInt($.jStorage.get(channelName + '-sidebar-size'))) + 'px'
                }, 'fast', function() {
                    $(channelName + ' .sidebar').fadeIn('fast');
                });
            } else {
                $(channelName + ' .chat').animate({
                    'right': (parseInt($(channelName + ' .sidebar').css('width')) + privateMethods.sidebar.separatorWidth) + 'px'
                }, 'fast', complete);
                $(channelName + ' .separator').animate({
                    'right': (parseInt($(channelName + ' .sidebar').css('width'))) + 'px'
                }, 'fast', function() {
                    $(channelName + ' .sidebar').fadeIn('fast');
                });
            }
        }
    };

    privateMethods.user = {
        formatGender: function(user) {
            return mote.compile('<span class="gender {{gender}}">{{literal}}</span>')({
                gender: user.gender === 'M' ? 'male' : 'female',
                literal: privateMethods.user.getGenderLiteral(user.gender)
            });
        },

        getGenderLiteral: function(gender) {
            return gender !== 'N' ? gender === 'M' ? '♂' : '♀' : '';
        }
    };

    privateMethods.message = {
        formatSendTo: function(names) {
            return mote.compile('→ ({{{getNames}}}) ')({
                getNames: function() {
                    var resultString = '';

                    for (var idx in names) {
                        resultString += mote.compile('<button class="name {{#isMe}}me{{/isMe}}">{{name}}</button>{{#comma}}, {{/comma}}')({
                            name: names[idx],
                            isMe: names[idx] === $.fn.sys().options.currentUser.name,
                            comma: parseInt(idx) !== names.length - 1
                        });
                    }

                    return resultString;
                }
            });
        }
    };

    privateMethods.channels = {
        resizing: false,
        padding: 10,
        space: 5,
        borders: 2,

        show: function(callback) {
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
                step: function(now) {
                    if (sidebarPos !== 'auto') $('aside.sidebar').css('left', (parseInt(sidebarPos) + privateMethods.channels.padding * 2 + privateMethods.channels.space * 2 - now) + 'px');
                },
                complete: function() {
                    var scrollable = $('#channels-content section .scrollableArea').filter(':visible');
                    scrollable.prop({ scrollTop: scrollable.prop('scrollHeight') });
                    privateMethods.tab.autoWidth();
                }
            });
        },
        hide: function(callback) {
            if (parseInt($('#channel-list').css('left')) < 0) {
                if (typeof callback === 'function') return callback();
                return;
            }

            var sidebarPos = $('#channels-content > section').filter(':visible').find('aside.sidebar').css('left');

            $('#channel-list').animate({ 'left': '-' + (parseInt($('#channel-list').css('width'))) + 'px' }, 'fast', callback);
            $('#channel-list-holder').animate({ 'left': '10px' });

            $('#channels, #channels-content').animate({
                'left': privateMethods.channels.padding + parseInt($('#channel-list-holder').css('width')) + privateMethods.channels.space + privateMethods.channels.borders * 2 + 'px'
            }, {
                duration: 'fast',
                step: function(now) {
                    if (sidebarPos !== 'auto') $('aside.sidebar').css('left', (parseInt(sidebarPos) + privateMethods.channels.borders * 2 + privateMethods.channels.padding + privateMethods.channels.space * 2 + parseInt($('#channel-list-holder').css('width')) + parseInt($('#channel-list').css('width')) - now) + 'px');
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
            init: function(channel) {
                privateMethods.channel.qtips.profile.events(channel);
                privateMethods.channel.qtips.info.events(channel);
                privateMethods.channel.qtips.tabArrow();
            },
            info: {
                tooltip: function(button, channelName, channelId) {
                    $(button).removeData('qtip').qtip($.extend(true, {}, privateMethods.channel.qtips.floatParams, {
                        content: {
                            title: {
                                text: 'Информация о чате "' + channelName + '"'
                            },
                            text: 'Загрузка...',
                            ajax: {
                                url: '/channel/' + encodeURIComponent(channelId) + '/info',
                                success: function(data) {
                                    this.set('content.text', mote.compile($('#mu-ui-channel-qtips-info').html())({
                                        users: data.users,
                                        messages: data.messages,
                                        owner: data.owner,
                                        date: $.fn.sys().time.date($.fn.sys().time.parse(data.date)),
                                        url: $('#channels li button#channel-' + channelId).data('url'),
                                        ifOwner: data.owner !== '$',
                                        ifMessages: data.messages > 0
                                    }));
                                },
                                data: { _csrf: privateMethods.options.csrf }
                            }
                        },
                        position: { viewport: $(window) },
                        show: { event: false }
                    })).show();
                },
                events: function(channel) {
                    $('#channels li').on('mouseup', 'button#channel-' + channel, function(event) {
                        if (event.which !== 3) return;
                        if ($.fn.sys().options.currentUser.id === '0' || $(this).data('private') || $.fn.sys().actions.popup) return;
                        privateMethods.channel.qtips.info.tooltip($(this), $(this).find('span.name').text(), channel);
                    });
                }
            },
            profile: {
                tooltip: function (button, userName, channelId) {
                    $(button).removeData('qtip').qtip($.extend(true, {}, privateMethods.channel.qtips.floatParams, {
                        content: {
                            title: { text: 'Профиль ' + userName },
                            ajax: {
                                url: '/user/' + encodeURIComponent(userName) + '/profile',
                                success: function(data) {
                                    this.set('content.text', mote.compile($('#mu-ui-channel-qtips-profile').html())({
                                        pic: typeof data.pic == 'undefined' ? '/images/web/userpic1.png' : '/userpics/' + data.pic,
                                        status: $.fn.sys().status.toStringDisplay(data.status),
                                        gender: $.fn.sys().gender.toStringDisplay(data.gender),
                                        messages: data.messages,
                                        points: data.points,
                                        user: {
                                            name: data.name,
                                            status: data.status
                                        },
                                        isPrivateDisabled: data.status === 'F' || data.isIgnore ? 'disabled' : false,
                                        isIgnored: {
                                            disabled: data.isIgnore ? 'on' : 'off',
                                            command: data.isIgnore ? 'remove' : 'add',
                                            text: data.isIgnore ? 'Убрать игнор' : 'Игнор'
                                        }
                                    }));
                                },
                                data: { _csrf: privateMethods.options.csrf }
                            }
                        },
                        position: { viewport: $('#channel-' + channelId + '-content .scrollableArea') },
                        show: { event: false }
                    })).show();
                },
                events: function(channel) {
                    $('#channel-' + channel + '-content').on('mouseup', 'div.message button:not(.me), .sidebar button.name:not(.me)', function(event) {
                        if (event.which !== 3) return;
                        if ($.fn.sys().options.currentUser.id === '0' || $(this).text() === '$' || $.fn.sys().actions.popup) return;
                        privateMethods.channel.qtips.profile.tooltip($(this), $(this).text(), channel);
                    }).on('click', '.sidebar button.info:not(.me)', function() {
                        privateMethods.channel.qtips.profile.tooltip($(this), $(this).next().next().text(), channel);
                    });
                }
            },
            tabArrow: function() {
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
        items: []
    };

    // Public methods

    UInterface.prototype.tab = {
        add: function(channelName, channelId, params, callback) {
            if ($('#channel-' + channelId).length !== 0) return;

            $('#channels li').not('.arrow').removeClass('current');
            $('#channels-content section').hide();

            $("#channels li.arrow").before(mote.compile($('#mu-ui-tab-button').html())({
                'channel': { id: channelId, name: channelName },
                'close': $('#channels li').not('.arrow').size() > 0,
                'private': params['url'] === 'quizeton' ? true : (params['private'] || false)
            }));

            $('#channels-content').append(mote.compile($('#mu-ui-tab-chat').html())({
                channel: { id: channelId }
            }));

            for (var key in params) {
                $('#channels li button#channel-' + channelId).data(key, params[key]);
            }

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

            $('#channel-' + channelId + '-content .sidebar input.filter').change(function() {
                var filter = $(this).val().toLowerCase();

                if (filter) {
                    $('#channel-' + channelId + '-content .sidebar ul button.name').filter(function() {
                        return $(this).text().toLowerCase().indexOf(filter) < 0
                    }).parent().slideUp('fast');
                    $('#channel-' + channelId + '-content .sidebar ul button.name').filter(function() {
                        return $(this).text().toLowerCase().indexOf(filter) >= 0
                    }).parent().slideDown('fast');
                } else {
                    $('#channel-' + channelId + '-content .sidebar li').filter(':hidden').slideDown('fast');
                }

                return false;
            }).keyup(function() {
                $(this).change()
            });

            // Send to
            $('#channel-' + channelId + '-content').on('click', 'div.message button:not(.me), .sidebar button.name:not(.me)', function() {
                if ($.fn.sys().options.currentUser.id === '0' || $(this).text() === '$') return false;

                var name = $(this).text();
                var filter = function() { return name === $(this).text() };
                var namesCount = $('#channel-' + channelId + '-content .sendto li').length;

                if ($('#channel-' + channelId + '-content .sendto button.name').filter(filter).length > 0) return false;

                if (namesCount === 3) {
                    return $.fn.notifier('Вы можете обращаться не более чем к 3 пользователям');
                }

                $('#channel-' + channelId + '-content .sendto').append(mote.compile($('#mu-ui-tab-sendto').html())({
                    isHidden: namesCount > 0 ? 'display: none' : false,
                    name: name
                }));

                if (namesCount === 0) {
                    $('#channel-' + channelId + '-content .sendto').show('slide', { direction: 'left' }, 'fast');
                } else {
                    $('#channel-' + channelId + '-content .sendto li:last-child').show('drop', { direction: 'left' }, 'fast');
                }

                return false;
            });

            $('#channel-' + channelId + '-content .sendto').on('click', 'button.close', function() {
                $(this).parent().hide('drop', { direction: 'left' }, 'fast', function() {
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
                    $('#channel-' + channelId + '-content').show('fast', function() {
                        $(document).prop('title', $(document).prop('title').replace(/(?:\/\/\s).+$/, '// ' + channelName));
                        if (typeof callback === 'function') callback();
                        //privateMethods.sidebar.autoPosition();
                    });
                });
            } else {
                privateMethods.tab.updateArrow();
                if (typeof callback === 'function') callback();
            }
        },

        unreadCounter: function(button) {
            if ($(button).find('span.count').length > 0) {
                var titleCounter = $(document).prop('title').match(/(?!\()\d+(?=\))/);
                var tabCounter = $(button).find('span.count').text().match(/(?!\()\d+(?=\))/);

                if (tabCounter !== null) {
                    tabCounter = parseInt(tabCounter[0]);
                    if (titleCounter !== null) {
                        titleCounter = parseInt(titleCounter[0]);
                        if (titleCounter - tabCounter <= 0) {
                            $(document).prop('title', $(document).prop('title').replace(/^\(\d+\)\s/, ''));
                        } else {
                            $(document).prop('title', $(document).prop('title').replace(/(?!\()\d+(?=\))/, titleCounter - tabCounter));
                        }
                    }

                    $(button).find('span.count').remove();
                }
            }
        },

        height: function(channelId) {
            $('#channel-' + channelId + '-content .scrollableArea').css('height', ($('.chat:last').height() - parseInt($('scrollableArea').css('padding-bottom'))) + 'px');
        },

        flash: function(channelId, color) {
            var button = $('button#channel-' + channelId);
            for (var i = 0; i <= 120; i++) {
                button.prev().effect('highlight', { color: color }, 500);
                button.effect('highlight', { color: color }, 500);
                button.next().effect('highlight', { color: color }, 500);
            }
        }
    };

    UInterface.prototype.sidebar = {
        init: function(channelName, params) {
            privateMethods.sidebar.resizing = true;

            $(channelName + ' .separator').on('click', function(e) {
                e.preventDefault();
                if ($(channelName).hasClass('use-sidebar')) {
                    privateMethods.sidebar.hide(channelName, !params['private']);
                } else {
                    privateMethods.sidebar.show(channelName, !params['private']);
                }
            });

            if ($.jStorage.get(channelName + '-sidebar-size') !== null) {
                $(channelName + ' .sidebar').css('width', $.jStorage.get(channelName + '-sidebar-size'));
            }

            function resize(width) {
                $(channelName + ' .separator').css('right', width + 'px');
                $(channelName + ' .chat').css('right', width + privateMethods.sidebar.separatorWidth + 'px');
            }

            $(channelName + ' .sidebar').resizable({
                handles: 'w',
                minWidth: 150,
                maxWidth: 400,
                resize: function(event, ui) {
                    resize(ui.size.width);
                    privateMethods.sidebar.resizing = true;
                },
                stop: function() {
                    resize($(this).width());

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
        hide: function() {
            $('#login').hide('slide', { direction: 'up' }, 'fast', function() {
                $('#top').append(mote.compile($('#mu-ui-login').html())({ name: $.fn.sys().options.currentUser.name }));
                $('#top #user').show('slide', { direction: 'down' }, 'fast');
            });
        }
    };

    UInterface.prototype.user = {
        connect: function(channelId, user) {
            if ($('#channel-' + channelId + '-content .sidebar li button').filter(function() { return $(this).text() === user.name }).length === 0) {
                $('#channel-' + channelId + '-content .sidebar ul').append(privateMethods.user.format(user));
                $('#channel-' + channelId + '-content .sidebar header span').text(parseInt($('#channel-' + channelId + '-content .sidebar header span').text()) + 1);
                if ($.fn.sys().options.currentUser.id !== '0' && $.fn.sys().options.currentUser.ignore.indexOf(user.name) > -1) return;
                $('#channel-' + channelId + '-content .sidebar li:last-child').effect('pulsate', { times: 2 }, 1000, function() {
                    $.fn.sys().channel.notify(channelId, user, mote.compile($('#mu-ui-user-enter-notfication').html())({ name: user.name }));
                });
            }
        },

        disconnect: function(channelId, user) {
            $('#channel-' + channelId + '-content .sidebar li button').filter(function() {
                return $(this).text() === user.name
            }).fadeOut('slow', function() {
                $(this).parent().remove();
                $('#channel-' + channelId + '-content .sidebar header span').text(parseInt($('#channel-' + channelId + '-content .sidebar header span').text()) - 1);
            });

            $('#channel-' + channelId + '-content .sendto li button.name').filter(function() {
                return $(this).text() === user.name
            }).next().trigger('click');

            if ($('div.qtip').filter(':visible').find('button.yes').data('name') === user.name) {
                $(window).qtip('api').hide();

                $.fn.sys().actions.popup = false;
                $.fn.sys().actions['private'].queue.shift();

                if ($.fn.sys().actions['private'].queue.length > 0) {
                    privateMethods.channel.qtips['private']($.fn.sys().actions['private'].queue[0]);
                    $(window).qtip('api').show();
                }
            }

            $.fn.sys().channel.notify(channelId, user, mote.compile($('#mu-ui-user-exit-notfication').html())({ name: user.name }));
        },

        updateGender: function(channelId, user) {
            var li = $('#channel-' + channelId + '-content .sidebar li button').filter(function() { return $(this).text() === user.name }).parent();
            var span = li.find('span.gender');

            if (span.length > 0) {
                if (user.gender !== 'N') {
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
            } else if (user.gender !== 'N') {
                li.append(privateMethods.user.formatGender(user));
            }

            if ($.fn.sys().options.currentUser.id !== '0') {
                if (user.name === $.fn.sys().options.currentUser.name) {
                    $.fn.sys().options.updateUser($.extend({}, $.fn.sys().options.currentUser, { gender: user.gender }));
                }
            }

            $.fn.sys().channel.notify(channelId, user, mote.compile($('#mu-ui-user-gender-notfication').html())({ name: user.name }));
        },

        updateStatus: function(channelId, user) {
            var li = $('#channel-' + channelId + '-content .sidebar li button').filter(function() { return $(this).text() === user.name }).parent();
            var status = li.find('span.status');

            if (user.status === 'O' && status.hasClass('online'))      return;
            if (user.status === 'F' && status.hasClass('offline'))     return;
            if (user.status === 'A' && status.hasClass('away'))        return;
            if (user.status === 'N' && status.hasClass('unavailable')) return;

            if ($.fn.sys().options.currentUser.id !== '0') {
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
        format: function(user) {
            return mote.compile($('#mu-ui-user-format').html())({
                isMe: user.name === $.fn.sys().options.currentUser.name,
                isIgnore: $.fn.sys().options.currentUser.id !== '0' && $.fn.sys().options.currentUser.ignore.indexOf(user.name) > -1 ? 'ignore' : false,
                status: user.status === 'F' ? 'online' : $.fn.sys().status.toString(user.status),
                gender: user.gender !== 'N' ? privateMethods.user.formatGender(user) : '',
                name: user.name
            });
        },
        highlightMe: function() {
            $('.message button.name, .sidebar button.name, .sidebar button.info').filter(function() {
                if ($(this).hasClass('info'))
                    return $(this).next().next().text() === $.fn.sys().options.currentUser.name;
                return $(this).text() === $.fn.sys().options.currentUser.name
            }).addClass('me');
        },
        filterIgnore: function() {
            $('.message button.name, .sidebar button.name').filter(function() {
                return $.fn.sys().options.currentUser.ignore.indexOf(this.innerHTML) > -1
            }).parent().addClass('ignore');

            $('.message button.name, .sidebar button.name').filter(function() {
                return $.fn.sys().options.currentUser.ignore.indexOf(this.innerHTML) === -1
            }).parent().removeClass('ignore');

            var scrollable = $('#channels-content section .scrollableArea').filter(':visible');
            scrollable.prop({ scrollTop: scrollable.prop('scrollHeight') });
        }
    };

    UInterface.prototype.message = {
        format: function(message) {
            return mote.compile($('#mu-ui-message-format').html())({
                getTime: function() {
                    var time = mote.compile($('#mu-ui-message-format-time').html())({
                        time: $.fn.sys().time.format($.fn.sys().time.parse(message.time))
                    });
                    if (message.id) {
                        return mote.compile($('#mu-ui-message-format-archive').html())({
                            messageId: message.id,
                            time: time
                        });
                    }
                    return time;
                },
                getName: mote.compile($('#mu-ui-message-format-name').html())({
                    name: message.name,
                    isMe: message.name === $.fn.sys().options.currentUser.name
                }),
                getData: ((message.to && message.to.length > 0) ? privateMethods.message.formatSendTo(message.to) : '') + $().emoticon(message.text)
            });
        }
    };

    UInterface.prototype.channels = {
        init: function() {
            if ($.jStorage.get('channel-list.size') !== null) {
                var diff = $('#channel-list').width() - parseInt($.jStorage.get('channel-list.size'));
                $('#channel-list').css('left', parseInt($('#channel-list').css('left')) + diff);
                $('#channel-list').css('width', $.jStorage.get('channel-list.size'));
            }

            function resize(width) {
                $('#channels, #channels-content').css('left', width + privateMethods.channels.padding + privateMethods.channels.borders * 2 + privateMethods.channels.space * 2 + parseInt($('#channel-list-holder').css('width')) + 'px');
                $('#channel-list-holder').css('left', width + privateMethods.channels.padding + privateMethods.channels.borders + privateMethods.channels.space + 'px');

                var sidebar = $('#channels-content .chat').filter(':visible').parent().find('aside.sidebar');
                if (sidebar.css('left') !== 'auto' && sidebar.css('opacity') !== '0') {
                    sidebar.css('left', (sidebar.parent().find('.chat').width() + privateMethods.sidebar.separatorWidth) + 'px');
                }
            }

            $('#channel-list').resizable({
                handles: 'e',
                minWidth: 150,
                maxWidth: 300,
                resize: function(event, ui) {
                    resize(ui.size.width);
                    privateMethods.channels.resizing = true;
                },
                stop: function() {
                    resize($(this).width());

                    $.jStorage.set('channel-list.size', $('#channel-list').css('width'));

                    var scrollable = $('#channels-content section .scrollableArea').filter(':visible');
                    scrollable.prop({ scrollTop: scrollable.prop('scrollHeight') });

                    privateMethods.channels.resizing = false;
                }
            });

            $('body').on('click', '#channel-list-holder', function() {
                privateMethods.channels.showChannelList(true);
            });

            $().scroller({
                scrollableArea: $('#channel-list menu'),
                spotUp: $('#channel-list .scrollingHotSpotUp'),
                spotDown: $('#channel-list .scrollingHotSpotDown'),
                mouseArea: $('#channel-list')
            });

            $('#channel-list input.filter').val('');

            $('#channel-list input.filter').change(function() {
                var filter = $(this).val().toLowerCase();

                if (filter) {
                    $('#channel-list menu span.name').filter(function() {
                        return $(this).text().toLowerCase().indexOf(filter) < 0
                    }).parent().parent().slideUp('fast');
                    $('#channel-list menu span.name').filter(function() {
                        return $(this).text().toLowerCase().indexOf(filter) >= 0
                    }).parent().parent().slideDown('fast');
                } else {
                    $('#channel-list menu li').filter(':hidden').slideDown('fast');
                }

                return false;
            }).keyup(function() {
                $(this).change();
            });

            $('#channels').on('click', 'li div.info button', function () {
                var tabButton = $(this).parent().next();
                var channelId = tabButton.attr('id');
                channelId = channelId.substr(8, channelId.length);
                if ($.fn.sys().options.currentUser.id === '0' || $(tabButton).data('private') || $(this).hasClass('disabled') || $.fn.sys().actions.popup) return;
                privateMethods.channel.qtips.info.tooltip($(this), $(this).parent().next().find('span.name').text(), channelId);
            });

            privateMethods.channels.create();
        },
        create:function () {
            var limit = 100;
            $('form.create-channel textarea').keyup(function () {
                if (this.value.length >= limit) {
                    this.value = this.value.substring(0, limit);
                }
                $('form.create-channel span.chars').text(limit - this.value.length);
            });
        },
        showChannelList:function (remember) {
            if (parseInt($('#channel-list').css('left')) < 0 || !$('#channel-list').is(':visible')) {
                privateMethods.channels.show(function () {
                    $('#channel-list menu').prop({ scrollTop:0 });
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
                var filter = function() { return name === $(this).text() };
                var namesCount = $('#channel-' + channelId + '-content .type li').length;

                if (!privateMethods.channel.type.timeouts[channelId]) {
                    privateMethods.channel.type.timeouts[channelId] = [];
                }

                if (privateMethods.channel.type.timeouts[channelId][name]) {
                    clearTimeout(privateMethods.channel.type.timeouts[channelId][name]);
                }

                privateMethods.channel.type.timeouts[channelId][name] = setTimeout(function() {
                    $('#channel-' + channelId + '-content .type li').filter(filter).hide('drop', { direction: 'left' }, 'fast', function() {
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

                $('#channel-' + channelId + '-content .type').append(mote.compile($('#mu-ui-channel-type-private').html())({
                    name: name,
                    isHidden: namesCount > 0
                }));

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
            'private': function(name) {
                $(window).qtip($.extend(true, {}, privateMethods.channel.qtips.modalParams, {
                    id: 'privateModal',
                    content: {
                        text: mote.compile($('#mu-ui-channel-qtips-private').html())({ name: name }),
                        title: {
                            text: mote.compile('Приглашение в приват [{{time}}]')({
                                time: $.fn.sys().time.format(new Date())
                            })
                        }
                    }
                }));
            }
        },
        format: function(channel) {
            return mote.compile($('#mu-ui-channel-format').html())({ channel: channel });
        }
    };

    UInterface.prototype.layers = {
        hide: function(callback) {
            if ($('#container').css('opacity') === '1') {
                if (typeof callback === 'function') callback();
                return;
            }
            for (var key in privateMethods.layers.items) {
                var item = privateMethods.layers.items[key];
                if (!$(item.layer).is(':visible')) continue;
                $(item.layer).fadeOut('fast', function() {
                    if (typeof item.callbacks.hide === 'function') item.callbacks.hide();
                    if (typeof callback === 'function') callback();
                });
            }
        },
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
                if (typeof privateMethods.layers.items[name].callbacks.show === 'function') privateMethods.layers.items[name].callbacks.show();
                if (typeof callback === 'function') callback();
            });
        },
        register: function() {
            privateMethods.layers.add('account', 'section.account', null, null);
            privateMethods.layers.add('forgot', 'section.forgot', null, null);
            privateMethods.layers.add('help', 'section.help', function () {
                $('#bottom #help').addClass('pressed');
            }, function () {
                $('#bottom #help').removeClass('pressed');
            });
            privateMethods.layers.add('create', 'section.create-channel', function () {
                $('#create-channel').addClass('pressed');
            }, function () {
                $('#create-channel').removeClass('pressed');
            });
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

    $.fn.ufc = function(csrf) {
        return instance ? instance : instance = new UInterface({ csrf: csrf });
    };
})(jQuery, window, document, GibberishAES, mote);